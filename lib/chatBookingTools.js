// ============================================================
// CHAT BOOKING TOOLS — the function-calling surface for the
// conversational AI booking flow (Pricing Engine Phase 10).
//
// Deliberately narrow: this is a NEW, unauthenticated, public web
// surface, so it exposes only what's needed to quote and create a
// booking — check_availability, get_quote, create_booking. Unlike
// lib/vapiTools.js (the phone assistant, reached by dialling a real
// number), it does NOT expose lookup_booking, cancel_booking,
// reschedule_booking, issue_refund, or send_email — giving an anonymous
// web chat the ability to look up or cancel ANY booking by guessing a
// reference, or to trigger a refund, would be a real abuse surface.
// Those stay on the authenticated/phone channels.
//
// Reuses the exact same pricing/booking pipeline as the static form
// (create-booking's core logic) and the phone assistant
// (geocode -> quoteCustomerPrice -> createQuoteDecision -> insert
// booking -> Stripe deposit intent), so a chat-booked job is priced and
// gated identically to a form-booked one — no parallel pricing logic.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { geocodeAddress } from './geocode.js';
import { calculateTravelFee } from './route.js';
import { createDepositPayment } from './stripe.js';
import { quoteCustomerPrice, getPricingConfig, LOAD_LABELS } from './pricing.js';
import { createQuoteDecision, linkQuoteDecisionToBooking } from './quoteDecision.js';
import { toCents } from './costLedger.js';
import { jobDateTimeUTC, dayType, formatDateLong, formatTime, edmontonNowParts } from './dates.js';
import { computeSurgeMultiplier } from './surge.js';
import { resolveDispatch } from './dispatch.js';
import { randomBytes } from 'crypto';
import { normalizePhone } from './phone.js';
import { sendOperatorAlert } from './messages.js';
import { recordTimelineEvent } from './timeline.js';
import { createPriceLedgerEntry } from './priceLedger.js';

// ------------------------------------------------------------
// check_availability — read-only, safe for an anonymous session.
// ------------------------------------------------------------
export async function checkAvailability({ date, day_type } = {}) {
  const today = edmontonNowParts().date;
  let q = supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('is_available', true)
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });
  if (date) q = q.eq('slot_date', date);
  if (day_type) q = q.eq('day_type', day_type);
  const { data } = await q.limit(12);
  const open = (data || []).filter((s) => s.jobs_booked < s.max_jobs);
  if (open.length === 0) return { available: false, message: 'No open slots right now — I can add you to the waitlist instead.' };
  const grouped = {};
  for (const s of open) {
    grouped[s.slot_date] = grouped[s.slot_date] || [];
    grouped[s.slot_date].push({ time: s.slot_time, label: formatTime(s.slot_time), window_label: s.window_label || null });
  }
  return {
    available: true,
    slots: Object.entries(grouped).map(([date, times]) => ({ date, date_label: formatDateLong(date), times })),
  };
}

// ------------------------------------------------------------
// get_quote — real cost-engine price (same as the static form and
// phone assistant), not a separate estimate.
// ------------------------------------------------------------
export async function getQuote({
  load_size,
  address,
  stairs = 0,
  has_freon = false,
  freon_count = 0,
  same_day = false,
  job_date = null,
  job_time = null,
  weight_kg,
  volume_cuft,
}) {
  if (!['single_item', 'quarter', 'half', 'full'].includes(load_size)) {
    return { error: 'I need a valid load size: single item, quarter, half, or full.' };
  }
  const pricingConfig = await getPricingConfig();
  let geo = { lat: null, lng: null };
  try { geo = await geocodeAddress(address || 'Calgary, AB'); } catch { /* fall through with null coords */ }
  let travelFee = 0;
  if (geo?.lat) {
    try { travelFee = (await calculateTravelFee({ lat: geo.lat, lng: geo.lng })).fee; } catch { /* best effort */ }
  }
  const surge = job_date && job_time
    ? await computeSurgeMultiplier({ job_date, job_time, day_type: dayType(job_date) })
    : { multiplier: 1.0 };

  const priced = await quoteCustomerPrice({
    load_size, same_day, stairs, has_freon, freon_count, job_date, job_time,
    surge_multiplier: surge.multiplier, travel_fee: travelFee,
    lat: geo.lat, lng: geo.lng, address, weight_kg, volume_cuft, pricingConfig,
  });

  return {
    load_label: LOAD_LABELS[load_size],
    total: priced.total,
    deposit: priced.deposit,
    balance_due: priced.balance_due,
    base_price: priced.base_price,
    same_day_fee: priced.same_day_fee,
    stairs_fee: priced.stairs_fee,
    freon_fee: priced.freon_fee,
    travel_fee: priced.travel_fee,
    truck_size: priced.truck_size,
  };
}

// ------------------------------------------------------------
// create_booking — same pipeline as app/api/create-booking/route.js:
// real quote -> server-enforced quote decision -> insert -> Stripe
// deposit intent. Returns a client_secret so the web chat can render
// the existing PaymentStep component inline (no SMS deposit link needed
// — this is an active web session, unlike phone/SMS channels).
// ------------------------------------------------------------
export async function createChatBooking({
  name,
  phone,
  email = null,
  address,
  load_size,
  same_day = false,
  stairs = 0,
  has_freon = false,
  freon_count = 0,
  job_date,
  job_time,
  description_text = null,
  ai_load_estimate = null,
  ai_weight_estimate_kg = null,
  ai_volume_estimate_cuft = null,
  ai_confidence = null,
  has_hazmat = false,
  hazmat_description = null,
  photos = [],
  sessionId = null,
}) {
  if (!name || !phone || !address || !load_size || !job_date || !job_time) {
    return { error: 'I still need a few details before I can book this — name, phone, address, what you need hauled, and a date/time.' };
  }
  const normalizedPhone = normalizePhone(phone);

  const now = new Date();
  const earliest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (jobDateTimeUTC(job_date, job_time) < earliest) {
    return { error: 'That time is less than 24 hours away — I need to book at least a day out. Want a different time?' };
  }

  const { data: slot } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('slot_date', job_date)
    .eq('slot_time', job_time)
    .maybeSingle();
  if (!slot || slot.jobs_booked >= slot.max_jobs) {
    return { error: 'That slot just filled up — want to try a different time?' };
  }

  const pricingConfig = await getPricingConfig();
  let geo;
  try {
    geo = await geocodeAddress(address);
  } catch {
    return { error: "I couldn't verify that address — could you double check it?" };
  }
  let travelFee = 0;
  let travelKm = 0;
  try {
    const t = await calculateTravelFee({ lat: geo.lat, lng: geo.lng });
    travelFee = t.fee;
    travelKm = t.km;
  } catch { /* best effort */ }

  const surge = await computeSurgeMultiplier({ job_date, job_time, day_type: dayType(job_date) });

  const priced = await quoteCustomerPrice({
    load_size, same_day, stairs, has_freon, freon_count, job_date, job_time,
    surge_multiplier: surge.multiplier, travel_fee: travelFee,
    lat: geo.lat, lng: geo.lng, address,
    weight_kg: ai_weight_estimate_kg || undefined,
    volume_cuft: ai_volume_estimate_cuft || undefined,
    pricingConfig,
  });

  const quoteInput = {
    name, phone: normalizedPhone || phone, address, load_size, same_day, stairs,
    has_freon, freon_count, job_date, job_time,
    lat: geo.lat, lng: geo.lng, travel_km: travelKm, truck_size: priced.truck_size,
    photos, photo_skipped: photos.length === 0, description_text,
    ai_load_estimate, ai_weight_estimate_kg, ai_confidence, has_hazmat, hazmat_description,
    requested_price_cents: toCents(priced.total),
  };
  const decision = await createQuoteDecision({
    quoteInput,
    priceCents: toCents(priced.total),
    costSnapshot: priced.raw_cost_snapshot,
    depositCents: toCents(priced.deposit),
    actorType: 'chat_agent',
  });
  if (decision.state !== 'approved') {
    return decision.state === 'needs_evidence'
      ? { error: 'I can give you a rough estimate, but I need a photo or a fuller description to lock in a firm price.' }
      : { error: 'This one needs a quick manager review before I can confirm it — a team member will text you shortly with a firm quote.' };
  }

  const bookingRef = 'JH ' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      name, phone: normalizedPhone || phone, email, address,
      quadrant: geo.quadrant, lat: geo.lat, lng: geo.lng,
      load_size, base_price: priced.base_price,
      same_day, same_day_fee: priced.same_day_fee,
      stairs, stairs_fee: priced.stairs_fee,
      has_freon, freon_count: priced.freon_count, freon_fee: priced.freon_fee,
      travel_fee: priced.travel_fee, travel_km: travelKm,
      truck_size: priced.truck_size, truck_fee: priced.truck_fee,
      total_price: priced.total,
      dynamic_multiplier: priced.dynamic_multiplier, surge_multiplier: priced.surge_multiplier, surge_mode: surge.mode,
      deposit_amount: priced.deposit, balance_due: priced.balance_due,
      job_date, job_time, job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
      photos, photo_skipped: photos.length === 0, description_text,
      ai_load_estimate, ai_weight_estimate_kg, ai_volume_estimate_cuft, ai_confidence,
      has_hazmat, hazmat_description,
      source: 'chat_agent',
      status: 'pending_payment',
      booking_ref: bookingRef,
      quote_decision_id: decision.id,
    })
    .select()
    .single();
  if (error) return { error: 'Something went wrong creating the booking. Let me try again.' };

  await linkQuoteDecisionToBooking({ decisionId: decision.id, bookingId: booking.id });

  await createPriceLedgerEntry({
    booking_id: booking.id,
    quote_decision_id: decision.id,
    ledger_type: 'initial_quote',
    pricing: { ...priced, travel_km: travelKm, pricing_config_version: 'runtime_system_config' },
    actor_type: 'customer',
    reason: 'Customer accepted chat-assistant quote before deposit payment',
    customer_notification_status: 'shown_in_chat',
  });

  await recordTimelineEvent({
    entity_type: 'booking',
    entity_id: booking.id,
    event_type: 'booking_created_pending_payment',
    actor_type: 'customer',
    source: 'chat_booking_flow',
    after: booking,
    metadata: { session_id: sessionId },
  });

  const intent = await createDepositPayment({
    booking_id: booking.id,
    customer_name: name,
    receipt_email: email,
    amount_cents: decision.deposit_cents,
    quote_decision_ref: decision.quote_decision_ref,
  });
  await supabaseAdmin.from('bookings').update({ stripe_payment_intent_id: intent.id }).eq('id', booking.id);

  const trackingToken = randomBytes(16).toString('hex');
  await supabaseAdmin.from('bookings').update({ tracking_token: trackingToken }).eq('id', booking.id);

  try {
    await resolveDispatch({
      id: booking.id, job_date, lat: geo.lat, lng: geo.lng, load_size,
      ai_weight_estimate_kg: ai_weight_estimate_kg || null,
    });
  } catch (e) {
    console.error('[dispatch] chat booking resolveDispatch failed:', e.message);
  }

  // Operator alert — chat bookings never sent this (audit C1); only the web
  // form flow (via the Stripe deposit webhook's handleBookingConfirmed) did.
  try {
    await sendOperatorAlert(booking);
  } catch (e) {
    console.error('[chat-booking] operator alert failed:', e.message);
  }

  return {
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    client_secret: intent.client_secret,
    total: priced.total,
    deposit: priced.deposit,
    balance_due: priced.balance_due,
    breakdown: {
      base_price: priced.base_price,
      same_day_fee: priced.same_day_fee,
      stairs_fee: priced.stairs_fee,
      freon_fee: priced.freon_fee,
      travel_fee: priced.travel_fee,
      total: priced.total,
      deposit: priced.deposit,
      balance_due: priced.balance_due,
    },
  };
}

// ------------------------------------------------------------
// Tool schemas (OpenAI/Groq function-calling format).
// ------------------------------------------------------------
export const CHAT_BOOKING_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check open pickup slots. Call this when the customer asks what times are available, or before confirming a date/time.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'A specific date YYYY-MM-DD, if the customer named one.' },
          day_type: { type: 'string', enum: ['weekday', 'saturday', 'sunday', 'either'], description: 'General day preference if no specific date was given.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quote',
      description: "Get a real price quote once you know the load size and address. Call this before telling the customer a price — never invent or estimate a number yourself.",
      parameters: {
        type: 'object',
        properties: {
          load_size: { type: 'string', enum: ['single_item', 'quarter', 'half', 'full'] },
          address: { type: 'string' },
          stairs: { type: 'integer', description: 'Number of flights of stairs, 0 if none.' },
          has_freon: { type: 'boolean', description: 'True if there is a fridge/freezer/AC unit/water cooler.' },
          freon_count: { type: 'integer' },
          same_day: { type: 'boolean' },
          job_date: { type: 'string', description: 'YYYY-MM-DD if already chosen.' },
          job_time: { type: 'string', description: 'HH:MM 24h if already chosen.' },
        },
        required: ['load_size', 'address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create the actual booking once the customer has confirmed the quote, and you have their name, phone, address, load size, and a chosen date/time from check_availability. This creates a real booking and a $50 deposit payment request — only call this after the customer has explicitly agreed to book.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          load_size: { type: 'string', enum: ['single_item', 'quarter', 'half', 'full'] },
          same_day: { type: 'boolean' },
          stairs: { type: 'integer' },
          has_freon: { type: 'boolean' },
          freon_count: { type: 'integer' },
          job_date: { type: 'string' },
          job_time: { type: 'string' },
        },
        required: ['name', 'phone', 'address', 'load_size', 'job_date', 'job_time'],
      },
    },
  },
];

export async function runChatBookingTool(name, args, context = {}) {
  switch (name) {
    case 'check_availability':
      return checkAvailability(args);
    case 'get_quote':
      return getQuote(args);
    case 'create_booking':
      return createChatBooking({
        ...args,
        ai_load_estimate: context.ai_load_estimate,
        ai_weight_estimate_kg: context.ai_weight_estimate_kg,
        ai_volume_estimate_cuft: context.ai_volume_estimate_cuft,
        ai_confidence: context.ai_confidence,
        has_hazmat: context.has_hazmat,
        hazmat_description: context.hazmat_description,
        description_text: context.description_text,
        photos: context.photos,
        sessionId: context.sessionId,
      });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
