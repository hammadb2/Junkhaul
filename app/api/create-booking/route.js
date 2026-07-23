import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { quoteCustomerPrice, getPricingConfig, PRICING, checkWeightFlag, LOAD_LABELS } from '@/lib/pricing';
import { computeSurgeMultiplier } from '@/lib/surge';
import { geocodeAddress } from '@/lib/geocode';
import { calculateTravelFee } from '@/lib/route';
import { createDepositPayment } from '@/lib/stripe';
import { jobDateTimeUTC, dayType, formatDateLong, formatTime } from '@/lib/dates';
import { sendSMS } from '@/lib/sms';
import { sendDepositLink } from '@/lib/messages';
import { resolveDispatch } from '@/lib/dispatch';
import { randomBytes } from 'crypto';
import { normalizePhone } from '@/lib/phone';
import { ATTRIBUTION_COOKIE, captureAttribution } from '@/lib/attribution';
import { createPriceLedgerEntry } from '@/lib/priceLedger';
import { recordTimelineEvent } from '@/lib/timeline';
import { toCents } from '@/lib/money';
import { createQuoteDecision, linkQuoteDecisionToBooking } from '@/lib/quoteDecision';

export const runtime = 'nodejs';

const LOAD_ORDER = ['single_item', 'quarter', 'half', 'full'];

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email = null,
      address,
      unit = null,
      address_data = null,
      is_apartment = false,
      customer_notes = null,
      load_size,
      same_day = false,
      stairs = 0,
      has_freon = false,
      freon_count = 0,
      freon_evacuation_claimed = false,
      freon_evacuation_status = 'not_claimed',
      truck_size = 15,
      job_date,
      job_time,
      job_window_label = null,
      job_window_start = null,
      job_window_end = null,
      photos = [],
      photo_skipped = false,
      description_text = null,
      ai_load_estimate = null,
      ai_weight_estimate_kg = null,
      ai_volume_estimate_cuft = null,
      ai_landfill_weight_kg = null,
      heavy_item_extra_minutes = 0,
      ai_confidence = null,
      has_hazmat = false,
      hazmat_description = null,
      flag_for_review = false,
      flag_reason = null,
      itemized_items = null,
      possible_cross_photo_duplicates = null,
      photo_quote_tier = null,
      source = 'web',
      referral_code = null,
      is_custom_slot = false,
      session_id = null,
      sms_consent_source = 'booking_details',
    } = body;

    const normalizedPhone = normalizePhone(phone);

    // Required-field validation
    if (!name || !phone || !email || !address || !load_size || !job_date || !job_time) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!LOAD_ORDER.includes(load_size)) {
      return NextResponse.json({ error: 'Invalid load size.' }, { status: 400 });
    }

    // Reject slots that have already passed. Our guarantee is "gone within
    // 24 hours" of booking, not "24 hours' notice required" — same-day slots
    // are intentionally offered by /api/slots and must be accepted here too.
    const now = new Date();
    const jobDateTime = jobDateTimeUTC(job_date, job_time);
    if (jobDateTime < now) {
      return NextResponse.json(
        { error: 'That time has already passed. Please pick another slot.' },
        { status: 400 }
      );
    }

    // Verify the slot still has capacity — or create a custom slot if needed
    const { data: slot } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('slot_date', job_date)
      .eq('slot_time', job_time)
      .maybeSingle();

    const isCustomSlot = body.is_custom_slot === true;

    if (!slot) {
      if (isCustomSlot) {
        // Create the slot on the fly for custom bookings
        const { error: createErr } = await supabaseAdmin
          .from('schedule')
          .insert({
            slot_date: job_date,
            slot_time: job_time,
            day_type: dayType(job_date),
            is_available: true,
            max_jobs: 5,
            jobs_booked: 0,
            window_label: job_window_label || null,
            window_start: job_window_start || null,
            window_end: job_window_end || null,
          });
        if (createErr) {
          return NextResponse.json(
            { error: 'Could not create that time slot. Please try another.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'That time slot is not available. Please pick another.' },
          { status: 409 }
        );
      }
    } else if (slot.jobs_booked >= slot.max_jobs || !slot.is_available) {
      return NextResponse.json(
        { error: 'That time slot was just taken. Please pick another.' },
        { status: 409 }
      );
    }

    // Load runtime pricing config so the admin Control Panel can tune
    // prices without a deploy.
    const pricingConfig = await getPricingConfig();

    // Real-time demand surge — computed from live slot-fill velocity
    // vs. historical baseline (or a conservative bootstrap rule until
    // enough history exists). See lib/surge.js.
    const surge = await computeSurgeMultiplier({
      job_date,
      job_time,
      day_type: dayType(job_date),
    });

    // Price is ALWAYS computed server-side.
    // Travel fee is calculated after geocoding (needs customer coords).
    // We'll compute the priced object below, after geo is available.
    let priced;

    // Geocode for dispatch/quadrant — use Mapbox data from frontend if available, else geocode
    let geo;
    if (address_data?.lat && address_data?.lng) {
      // Determine quadrant from lat/lng
      const isNorth = address_data.lat >= 51.0447;
      const isEast = address_data.lng >= -114.0719;
      const quadrant = `${isNorth ? 'NW' : 'SW'}${isEast ? 'E' : 'W'}`.replace(/(?<=[NS])W(?=E)/, '');
      // Simpler: just compute it
      const ns = address_data.lat >= 51.0447 ? 'N' : 'S';
      const ew = address_data.lng >= -114.0719 ? 'E' : 'W';
      geo = { lat: address_data.lat, lng: address_data.lng, quadrant: `${ns}${ew}`, postal_code: address_data.postal_code || null };
    } else {
      geo = await geocodeAddress(unit ? `${unit} ${address}` : address);
    }

    // Calculate travel fee: home → U-Haul pickup (Balzac) → customer.
    // Best-effort — defaults to 0 if geocoding failed.
    let travelFee = 0;
    let travelKm = 0;
    try {
      const travel = await calculateTravelFee({ lat: geo.lat, lng: geo.lng });
      travelFee = travel.fee;
      travelKm = travel.km;
    } catch (err) {
      console.error('Travel fee calculation failed:', err.message);
    }

    // Base price now comes from the real internal cost engine (smallest
    // 15/20/26ft truck that safely covers the job's actual weight AND
    // volume, real route distance, live fuel, labor, disposal, overhead,
    // and target margin) instead of a flat per-load-size lookup — see
    // lib/pricing.js's quoteCustomerPrice. The customer's own truck_size
    // selection is no longer what determines the truck or its cost; the
    // engine always picks what the job actually needs.
    priced = await quoteCustomerPrice({
      load_size,
      same_day,
      stairs,
      has_freon,
      freon_count,
      job_date,
      job_time,
      surge_multiplier: surge.multiplier,
      travel_fee: travelFee,
      lat: geo.lat,
      lng: geo.lng,
      address,
      weight_kg: ai_weight_estimate_kg || undefined,
      volume_cuft: ai_volume_estimate_cuft || undefined,
      landfill_weight_kg: ai_landfill_weight_kg ?? undefined,
      heavy_item_extra_minutes,
      pricingConfig,
    });

    // Server-side no-loss quote gate.
    const quoteInput = {
      name,
      phone: normalizedPhone || phone,
      address,
      unit,
      load_size,
      same_day,
      stairs,
      has_freon,
      freon_count,
      job_date,
      job_time,
      job_window_label,
      job_window_start,
      job_window_end,
      travel_km: travelKm,
      truck_size: priced.truck_size,
      photos,
      photo_skipped,
      description_text,
      ai_load_estimate,
      ai_weight_estimate_kg,
      ai_volume_estimate_cuft,
      ai_landfill_weight_kg,
      heavy_item_extra_minutes,
      ai_confidence,
      has_hazmat,
      hazmat_description,
      requested_price_cents: toCents(priced.total),
    };
    const decision = await createQuoteDecision({
      quoteInput,
      priceCents: toCents(priced.total),
      // Reuse the exact cost snapshot that set the price above, rather
      // than letting quoteDecision.js recompute a second, independent
      // snapshot — guarantees the profit-protection check is judging the
      // same assumptions the price was actually built from.
      costSnapshot: priced.raw_cost_snapshot,
      depositCents: toCents(priced.deposit ?? PRICING.deposit),
      actorType: 'customer',
    });

    if (decision.state !== 'approved') {
      return NextResponse.json(
        {
          state: decision.state,
          quote_decision_ref: decision.quote_decision_ref,
          minimum_price: decision.minimum_price_cents / 100,
          proposed_price: decision.price_cents / 100,
          reasons: decision.decision_reasons,
          message: decision.state === 'needs_evidence'
            ? 'We need a few more details before we can give a firm quote.'
            : 'This quote is below our policy minimum and requires a manager review.',
        },
        { status: 402 }
      );
    }

    // Weight safety flag.
    const weight = checkWeightFlag(load_size, ai_weight_estimate_kg, pricingConfig);
    const finalFlag = Boolean(flag_for_review) || weight.severity === 'hard';

    // Upgrade suggestion: AI thinks the load is bigger than what was selected.
    let upgrade_pending = false;
    let suggested_load_size = null;
    let suggested_price = null;
    if (ai_load_estimate && LOAD_ORDER.indexOf(ai_load_estimate) > LOAD_ORDER.indexOf(load_size)) {
      upgrade_pending = true;
      suggested_load_size = ai_load_estimate;
      const suggested = await quoteCustomerPrice({
        load_size: ai_load_estimate,
        same_day,
        stairs,
        has_freon,
        freon_count,
        job_date,
        job_time,
        surge_multiplier: surge.multiplier,
        travel_fee: travelFee,
        lat: geo.lat,
        lng: geo.lng,
        address,
        weight_kg: ai_weight_estimate_kg || undefined,
        volume_cuft: ai_volume_estimate_cuft || undefined,
        pricingConfig,
      });
      suggested_price = suggested.total;
    }

    let linkedLead = null;
    if (session_id) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('session_id', session_id)
        .maybeSingle();
      linkedLead = data || null;
    }
    if (!linkedLead && normalizedPhone) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('normalized_phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      linkedLead = data || null;
    }

    const insert = {
      lead_id: linkedLead?.id || null,
      name,
      phone: normalizedPhone || phone,
      email,
      address: unit ? `${unit}-${address}` : address,
      original_customer_address: address,
      normalized_address: address,
      unit,
      postal_code: geo.postal_code || null,
      quadrant: geo.quadrant,
      lat: geo.lat,
      lng: geo.lng,
      is_apartment,
      property_type: is_apartment ? 'apartment' : 'unknown',
      apartment_status: is_apartment ? 'detected' : null,
      geocoder_result: geo || null,
      service_area_result: { in_service_area: true, source: 'booking_create' },
      customer_notes,
      load_size,
      base_price: priced.base_price,
      same_day,
      same_day_fee: priced.same_day_fee,
      stairs,
      stairs_fee: priced.stairs_fee,
      has_freon,
      freon_fee: priced.freon_fee,
      // Photo evidence of an evacuation sticker never auto-waives the
      // fee (still fully charged above) -- it only flags the booking
      // for a human to verify against the actual photo. See Phase 5's
      // migration comment on bookings.freon_evacuation_status.
      freon_evacuation_claimed: Boolean(freon_evacuation_claimed),
      freon_evacuation_status: freon_evacuation_claimed ? 'pending_review' : 'not_claimed',
      travel_fee: priced.travel_fee,
      travel_km: travelKm,
      // Engine-selected truck — always the smallest of the 15/20/26ft
      // fleet that safely covers this job's real weight AND volume, not
      // whatever the customer clicked in the UI (see quoteCustomerPrice).
      truck_size: priced.truck_size,
      truck_fee: priced.truck_fee,
      total_price: priced.total,
      dynamic_multiplier: priced.dynamic_multiplier,
      surge_multiplier: priced.surge_multiplier,
      surge_mode: surge.mode,
      deposit_amount: PRICING.deposit,
      balance_due: priced.balance_due,
      job_date,
      job_time,
      job_window_label,
      job_window_start,
      job_window_end,
      job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
      photos,
      photo_skipped,
      description_text,
      ai_load_estimate,
      ai_weight_estimate_kg,
      ai_volume_estimate_cuft,
      ai_confidence,
      has_hazmat,
      hazmat_description,
      flag_for_review: finalFlag,
      flag_reason: finalFlag ? flag_reason || (weight.flag ? weight.reason : 'Flagged') : null,
      itemized_items: itemized_items || null,
      possible_cross_photo_duplicates: possible_cross_photo_duplicates || null,
      photo_quote_tier: photo_quote_tier || null,
      upgrade_pending,
      suggested_load_size,
      suggested_price,
      source,
      status: 'pending_payment',
      referral_code: referral_code || null,
      pricing_config_version: 'runtime_system_config',
      quote_decision_id: decision.id,
    };

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Booking insert failed:', error);
      return NextResponse.json({ error: 'Could not create booking.' }, { status: 500 });
    }

    const cookieSession = (await cookies()).get(ATTRIBUTION_COOKIE)?.value;
    const attributionSession = session_id || linkedLead?.session_id || cookieSession || null;
    if (attributionSession) {
      const attr = await captureAttribution({
        session_id: attributionSession,
        lead_id: linkedLead?.id || null,
        booking_id: booking.id,
        customer_id: normalizedPhone || phone,
        touch: {
          source,
          channel: body.channel || null,
          landing_path: body.landing_path || '/book',
          referrer: body.referrer || null,
          tracking_code: body.tracking_code || body.code || null,
          code: body.code || body.tracking_code || null,
          utm_source: body.utm_source || null,
          utm_medium: body.utm_medium || null,
          utm_campaign: body.utm_campaign || null,
          utm_content: body.utm_content || null,
          utm_term: body.utm_term || null,
          gclid: body.gclid || null,
          fbclid: body.fbclid || null,
        },
      });
      if (attr?.first || attr?.last) {
        try {
          await supabaseAdmin.from('bookings').update({
            attribution_record_id: attr.last?.id || attr.first?.id || null,
            first_touch_attribution_id: attr.first?.id || null,
            last_touch_attribution_id: attr.last?.id || null,
          }).eq('id', booking.id);
        } catch {}
      }
    }

    await createPriceLedgerEntry({
      booking_id: booking.id,
      lead_id: linkedLead?.id || null,
      quote_decision_id: decision.id,
      ledger_type: 'initial_quote',
      pricing: {
        ...priced,
        total: priced.total,
        deposit: PRICING.deposit,
        balance: priced.balance_due,
        travel_km: travelKm,
        truck_size: insert.truck_size,
        truck_fee: priced.truck_fee,
        surge_multiplier: surge.multiplier,
        pricing_config_version: 'runtime_system_config',
      },
      actor_type: 'customer',
      reason: 'Customer accepted website quote before deposit payment',
      customer_notification_status: 'shown_in_checkout',
    });

    // Link the approved quote decision to the booking.
    await linkQuoteDecisionToBooking({ decisionId: decision.id, bookingId: booking.id });

    await recordTimelineEvent({
      entity_type: 'booking',
      entity_id: booking.id,
      event_type: 'booking_created_pending_payment',
      actor_type: 'customer',
      source: 'booking_flow',
      after: insert,
      metadata: { lead_id: linkedLead?.id || null, sms_consent_source },
    });

    // Create the $50 deposit PaymentIntent (with receipt email if provided).
    const intent = await createDepositPayment({ booking_id: booking.id, customer_name: name, receipt_email: email, amount_cents: decision.deposit_cents, quote_decision_ref: decision.quote_decision_ref });
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', booking.id);
    await recordTimelineEvent({
      entity_type: 'booking',
      entity_id: booking.id,
      event_type: 'payment_intent_created',
      source: 'stripe',
      metadata: { payment_intent_id: intent.id, deposit: PRICING.deposit },
    });

    // ── Tracking token (customer portal link) ─────────────
    // Generate an unguessable token so the customer can track their
    // job, pay the balance, leave feedback, and tip the crew — all
    // without logging in. The token IS the auth.
    const trackingToken = randomBytes(16).toString('hex');
    await supabaseAdmin
      .from('bookings')
      .update({ tracking_token: trackingToken })
      .eq('id', booking.id);
    await recordTimelineEvent({
      entity_type: 'booking',
      entity_id: booking.id,
      event_type: 'tracking_token_created',
      source: 'booking_flow',
      metadata: { tracking_url: `https://junkhaul.ca/track/${trackingToken}` },
    });

    // ── Dynamic dispatch (24-hour guarantee) ──────────────
    // Resolve which crew assignment handles this booking — either
    // an existing truck with capacity, or a new one. Best-effort:
    // if it fails, the booking still goes through (admin can assign
    // manually).
    try {
      const dispatch = await resolveDispatch({
        id: booking.id,
        job_date,
        lat: geo.lat,
        lng: geo.lng,
        load_size,
        ai_weight_estimate_kg: ai_weight_estimate_kg || null,
      });
      console.log(`[dispatch] booking ${booking.booking_ref}: ${dispatch.action} — ${dispatch.reason}`);
    } catch (e) {
      console.error('[dispatch] resolveDispatch failed:', e.message);
    }

    // ── Referral processing (Step 7) ──────────────────────
    // If a referral code was provided, create a pending referral record.
    // The reward is fulfilled when the booking is completed.
    if (referral_code) {
      // Normalize: referral code can be a phone number or a code
      const refPhone = referral_code.replace(/\D/g, '').length === 10
        ? `+1${referral_code.replace(/\D/g, '')}`
        : null;
      try {
        await supabaseAdmin.from('referrals').insert({
          referrer_phone: refPhone || referral_code,
          referee_phone: normalizedPhone || phone,
          booking_id: booking.id,
          status: 'pending',
        });
      } catch {
        // best-effort — don't fail the booking over a referral error
      }
    }

    return NextResponse.json({
      booking_id: booking.id,
      booking_ref: booking.booking_ref,
      client_secret: intent.client_secret,
      total: priced.total,
      balance_due: priced.balance_due,
      deposit: PRICING.deposit,
      tracking_token: trackingToken,
      tracking_url: `https://junkhaul.ca/track/${trackingToken}`,
      // Simplified customer-facing breakdown (Pricing Engine Phase 9) —
      // only the line items a customer needs to see why their total is
      // what it is. Deliberately excludes priced.cost_engine/
      // raw_cost_snapshot (internal cost, margin, vehicle rental/labor
      // rates, truck selection reasoning) — that detail is for admin/
      // dispatch only (see components/admin/BookingDetailView.js's
      // CostBreakdown section, sourced from the linked quote_decision).
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
    });
  } catch (err) {
    console.error('create-booking error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
