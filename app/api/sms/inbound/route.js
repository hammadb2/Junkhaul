import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { generateRoutePlan, insertStopMidRoute } from '@/lib/routeOptimizer';
import { sendPushToEmployees } from '@/lib/pushNotifications';
import { edmontonNowParts, jobDateTimeUTC } from '@/lib/dates';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// POST /api/sms/inbound — YES-reply webhook for opportunistic offers.
//
// When a crew member sends an opportunistic offer SMS via
// /api/employee/offer-nearby, a `nearby_offers` record is created
// with a 5-minute expiry. The customer is told to "Reply YES in the
// next 5 minutes to lock it in." This endpoint receives that reply.
//
// It is a public webhook (no auth — it's called by the SMS provider)
// but verifies a shared secret when QUO_WEBHOOK_SECRET is set.
//
// Flow:
//   1. Parse the inbound SMS (Quo webhook format or plain {From,Body}).
//   2. Only act on a YES reply.
//   3. Look up the active nearby_offers record by customer_phone.
//   4. Atomic lock: SET status='accepted' WHERE id=X AND status='pending'.
//   5. On lock: convert to a real booking, insert into the crew's route,
//      push the new route version to the app, badge the stop as
//      opportunistic, and confirm with the customer.
//   6. On expired: tell the customer it expired.
//   7. On already-claimed: do nothing (another crew already got it).
// ============================================================

// --- Parse the inbound payload (supports Quo webhook + simple JSON) ---
function parseInbound(payload) {
  // Quo webhook format
  if (payload?.data?.resource) {
    const r = payload.data.resource;
    const ctx = payload.data.context || {};
    return {
      type: payload.type,
      from: ctx.senderIdentifier || null,
      text: r.text || '',
      messageId: r.id || null,
    };
  }
  // Simple JSON { From, Body } (Twilio-style or direct)
  const obj = payload?.data?.object || payload?.object || payload || {};
  return {
    type: payload?.type,
    from: obj.From || obj.from || null,
    text: obj.Body || obj.body || obj.text || '',
    messageId: obj.MessageSid || obj.id || null,
  };
}

// --- Verify the request is from a legitimate SMS provider ---
function verifyRequest(req) {
  const secret = process.env.QUO_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured (dev) — allow
  const fromHeader = req.headers.get('x-webhook-secret');
  const fromQuery = new URL(req.url).searchParams.get('secret');
  return fromHeader === secret || fromQuery === secret;
}

// --- Normalize a phone number to comparable forms ---
function phonePatterns(phone) {
  const digits = (phone || '').replace(/^\+1/, '').replace(/\D/g, '');
  return [phone, `+1${digits}`, `1${digits}`, digits].filter(Boolean);
}

// --- Find today's crew assignment for an employee ---
async function getTodaysAssignment(employeeId) {
  if (!employeeId) return null;
  const { date: todayStr } = edmontonNowParts();
  const { data } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_id, secondary_id, assignment_date')
    .or(`driver_id.eq.${employeeId},secondary_id.eq.${employeeId}`)
    .eq('assignment_date', todayStr)
    .maybeSingle();
  return data;
}

export async function POST(req) {
  // --- Verify sender ---
  if (!verifyRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // --- Parse payload ---
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { type, from, text, messageId } = parseInbound(payload);

  // Only react to inbound messages
  if (type && type !== 'message.received') return NextResponse.json({ ok: true });
  if (!from) return NextResponse.json({ ok: true });

  const trimmed = (text || '').trim();

  // Only act on YES (case-insensitive). Anything else is ignored here —
  // the general SMS conversation webhook handles free-text replies.
  if (!/^(yes|y|yeah|yep|confirm|book it|lock it in)\b/i.test(trimmed) && trimmed.toUpperCase() !== 'YES') {
    return NextResponse.json({ ok: true });
  }

  // --- Deduplicate: SMS providers retry if we're slow to respond ---
  if (messageId) {
    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('provider_sid', messageId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true });
  }

  // --- Log the inbound YES ---
  await supabaseAdmin.from('messages').insert({
    direction: 'inbound',
    from_number: from,
    to_number: process.env.QUO_PHONE_NUMBER,
    message_type: 'offer_reply',
    body: trimmed,
    provider_sid: messageId || null,
  });

  const now = new Date().toISOString();
  const patterns = phonePatterns(from);

  // --- Look up the most recent pending offer for this phone ---
  const { data: offers } = await supabaseAdmin
    .from('nearby_offers')
    .select('*')
    .or(patterns.map((p) => `customer_phone.eq.${p}`).join(','))
    .order('offered_at', { ascending: false })
    .limit(5);

  const offer = (offers || []).find((o) => o.status === 'pending') || (offers || [])[0];

  if (!offer) {
    // No offer on file — nothing for this webhook to do.
    return NextResponse.json({ ok: true });
  }

  // --- Already claimed by another crew? Do nothing. ---
  if (offer.status === 'accepted') {
    return NextResponse.json({ ok: true });
  }

  // --- Expired? Tell the customer. ---
  const isExpired = offer.offer_expires_at && new Date(offer.offer_expires_at) <= new Date(now);
  if (isExpired || offer.status === 'expired') {
    // Best-effort: mark expired so other crew devices stop showing it.
    await supabaseAdmin
      .from('nearby_offers')
      .update({ status: 'expired', accepted: false, responded_at: now })
      .eq('id', offer.id)
      .in('status', ['pending', null]);

    try {
      await sendSMS(
        from,
        'Sorry, that offer has expired. Call (587) 325-0751 to book.',
        null,
        'offer_expired'
      );
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: true });
  }

  // --- Atomic lock: only one YES can win ---
  const { data: locked, count } = await supabaseAdmin
    .from('nearby_offers')
    .update({ status: 'accepted', accepted: true, responded_at: now })
    .eq('id', offer.id)
    .eq('status', 'pending')
    .select();

  if (!count || count === 0 || !locked || locked.length === 0) {
    // Someone else accepted it first — do nothing.
    return NextResponse.json({ ok: true });
  }

  const lockedOffer = locked[0];

  // --- Resolve the original customer record ---
  let source = null;
  let sourceType = null;
  if (lockedOffer.lead_id) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lockedOffer.lead_id)
      .maybeSingle();
    source = data;
    sourceType = 'lead';
  } else if (lockedOffer.waitlist_id) {
    const { data } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', lockedOffer.waitlist_id)
      .maybeSingle();
    source = data;
    sourceType = 'waitlist';
  } else if (lockedOffer.booking_id) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', lockedOffer.booking_id)
      .maybeSingle();
    source = data;
    sourceType = 'booking';
  }

  // --- Resolve the crew assignment for the offer's employee ---
  const assignment = await getTodaysAssignment(lockedOffer.employee_id);
  if (!assignment) {
    // No active truck today — release the lock and tell the customer.
    await supabaseAdmin
      .from('nearby_offers')
      .update({ status: 'expired', accepted: false })
      .eq('id', lockedOffer.id);
    try {
      await sendSMS(
        from,
        'Sorry, our truck just wrapped up for the day. Call (587) 325-0751 to book your pickup.',
        null,
        'offer_unavailable'
      );
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: true });
  }

  // --- Build the booking record ---
  const { date: todayStr } = edmontonNowParts();
  const nowParts = edmontonNowParts();
  const jobTime = `${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`;
  const totalPrice =
    lockedOffer.discounted_price ||
    lockedOffer.original_price ||
    source?.total_price ||
    source?.ai_price_estimate ||
    0;

  const bookingRef = 'JH ' + Math.random().toString(36).substring(2, 7).toUpperCase();

  const bookingRow = {
    booking_ref: bookingRef,
    name: source?.name || lockedOffer.customer_name || 'Customer',
    phone: from,
    address: source?.address || null,
    quadrant: source?.quadrant || null,
    lat: source?.lat || null,
    lng: source?.lng || null,
    load_size: source?.load_size || 'quarter',
    base_price: totalPrice,
    same_day: true,
    same_day_fee: 0,
    stairs: source?.stairs || 0,
    has_freon: source?.has_freon || false,
    freon_count: source?.freon_count || 0,
    freon_fee: source?.freon_fee || 0,
    total_price: totalPrice,
    deposit_amount: 0,
    deposit_paid: 0,
    balance_due: totalPrice,
    job_date: todayStr,
    job_time: jobTime,
    job_datetime: jobDateTimeUTC(todayStr, jobTime).toISOString(),
    status: 'confirmed',
    crew_status: 'confirmed',
    crew_assignment_id: assignment.id,
    opportunistic: true,
    source: 'opportunistic',
    photo_skipped: true,
  };

  const { data: newBooking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .insert(bookingRow)
    .select()
    .single();

  if (bookingErr || !newBooking) {
    // Release the lock so the customer isn't left hanging on a failed conversion.
    await supabaseAdmin
      .from('nearby_offers')
      .update({ status: 'pending', accepted: false, responded_at: null })
      .eq('id', lockedOffer.id);
    try {
      await sendSMS(
        from,
        'Sorry, something went wrong on our end. Call (587) 325-0751 and well get you booked right away.',
        null,
        'offer_error'
      );
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ error: 'Booking creation failed' }, { status: 500 });
  }

  // --- Link the offer to the converted booking ---
  await supabaseAdmin
    .from('nearby_offers')
    .update({ converted_booking_id: newBooking.id })
    .eq('id', lockedOffer.id);

  // --- Mark the original lead/waitlist as converted ---
  if (sourceType === 'lead' && lockedOffer.lead_id) {
    await supabaseAdmin
      .from('leads')
      .update({
        converted_to_booking_id: newBooking.id,
        updated_at: now,
      })
      .eq('id', lockedOffer.lead_id);
  } else if (sourceType === 'waitlist' && lockedOffer.waitlist_id) {
    await supabaseAdmin
      .from('waitlist')
      .update({ converted_to_booking_id: newBooking.id })
      .eq('id', lockedOffer.waitlist_id);
  } else if (sourceType === 'booking' && lockedOffer.booking_id) {
    // The original was a future-day booking — cancel it since we just
    // created a same-day opportunistic replacement.
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', lockedOffer.booking_id);
  }

  // --- Insert the new stop into the crew's current route ---
  try {
    const { data: currentPlan } = await supabaseAdmin
      .from('route_plans')
      .select('*')
      .eq('crew_assignment_id', assignment.id)
      .order('route_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    let updatedPlan;
    let persistedByVersion = false;

    if (currentPlan) {
      // Existing route — insert the new stop at the optimal position.
      // insertStopMidRoute badges the stop as opportunistic automatically.
      updatedPlan = insertStopMidRoute(
        {
          ...currentPlan,
          stops:
            typeof currentPlan.stops === 'string'
              ? JSON.parse(currentPlan.stops)
              : currentPlan.stops,
        },
        {
          ...newBooking,
          is_opportunistic: true,
        }
      );
    } else {
      // No route yet — generate a fresh one. generateRoutePlan persists its
      // own row, so we flag it here and patch the opportunistic badge below
      // (it doesn't badge opportunistic stops itself).
      const crewLat = lockedOffer.crew_lat || 51.0447;
      const crewLng = lockedOffer.crew_lng || -114.0719;
      updatedPlan = await generateRoutePlan(assignment.id, crewLat, crewLng);
      persistedByVersion = true;
    }

    // Apply the amber OPPORTUNISTIC badge to the new booking's stop.
    if (updatedPlan && Array.isArray(updatedPlan.stops)) {
      const stop = updatedPlan.stops.find((s) => s.id === newBooking.id);
      if (stop) {
        stop.type = 'opportunistic';
        stop.opportunistic = true;
      }
    }

    // Persist the new route version.
    if (updatedPlan && !persistedByVersion) {
      // insertStopMidRoute returned a plain (un-persisted) object.
      await supabaseAdmin.from('route_plans').insert({
        crew_assignment_id: assignment.id,
        route_version: updatedPlan.route_version,
        crew_id: String(assignment.id),
        current_stop_id: updatedPlan.current_stop_id,
        stops: updatedPlan.stops,
        decision_reason: updatedPlan.decision_reason,
        generated_at: updatedPlan.generated_at,
      });
    } else if (updatedPlan && persistedByVersion) {
      // generateRoutePlan already persisted a row — update its stops in place
      // so the opportunistic badge is reflected.
      await supabaseAdmin
        .from('route_plans')
        .update({ stops: updatedPlan.stops })
        .eq('crew_assignment_id', assignment.id)
        .eq('route_version', updatedPlan.route_version);
    }
  } catch (err) {
    console.error('Route update failed for opportunistic booking:', err);
    // The booking is still confirmed — the crew will see it on next refresh.
  }

  // --- Push the new route version to the crew's devices ---
  const crewIds = [assignment.driver_id, assignment.secondary_id].filter(Boolean);
  try {
    await sendPushToEmployees(crewIds, {
      title: 'New pickup added',
      body: 'A nearby customer just said YES. Your route has been updated.',
      url: '/portal/route',
    });
  } catch {
    /* best-effort */
  }

  // --- Confirm with the customer ---
  try {
    await sendSMS(
      from,
      'Great! We are on our way. Your crew will arrive shortly.',
      newBooking.id,
      'offer_accepted'
    );
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, booking_id: newBooking.id });
}
