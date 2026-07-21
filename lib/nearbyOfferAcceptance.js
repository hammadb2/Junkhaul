// ============================================================
// nearbyOfferAcceptance.js
//
// Converts an accepted opportunistic-pickup offer (nearby_offers) into
// a real booking. This logic previously only existed in app/api/sms/
// inbound/route.js, which queries nearby_offers.status — a column
// that doesn't exist on the real table (it uses `accepted` boolean +
// `responded_at` instead) — and never receives real traffic anyway,
// since Quo is configured to call app/api/sms-webhook. The "Reply YES"
// opportunistic-offer flow has had no working acceptance path in
// production. This is the corrected implementation, callable from
// wherever a matched YES reply for a nearby_offer is resolved.
// ============================================================
import { supabaseAdmin } from './supabase';
import { resolveDispatch } from './dispatch';
import { sendPushToEmployees } from './pushNotifications';
import { recordTimelineEvent } from './timeline';
import { sendSMS } from './sms';
import { edmontonNowParts, jobDateTimeUTC } from './dates';

export async function acceptNearbyOffer({ offerId, respondingPhone, client = supabaseAdmin }) {
  const now = new Date().toISOString();

  // Atomic claim: only one YES can win. Only succeeds if nobody has
  // responded to this offer yet (responded_at IS NULL) and it hasn't
  // expired.
  const { data: claimed, error: claimErr } = await client
    .from('nearby_offers')
    .update({ accepted: true, responded_at: now })
    .eq('id', offerId)
    .is('responded_at', null)
    .gt('offer_expires_at', now)
    .select()
    .maybeSingle();

  if (claimErr) return { ok: false, reason: 'claim_error', error: claimErr.message };
  if (!claimed) {
    // Either already responded to (by this same claim race, or the
    // customer already replied once) or expired.
    const { data: offer } = await client.from('nearby_offers').select('*').eq('id', offerId).maybeSingle();
    if (offer?.responded_at) return { ok: false, reason: 'already_responded' };
    return { ok: false, reason: 'expired' };
  }

  // Resolve the original source record (lead, waitlist, or booking).
  let source = null;
  let sourceType = null;
  if (claimed.lead_id) {
    const { data } = await client.from('leads').select('*').eq('id', claimed.lead_id).maybeSingle();
    source = data;
    sourceType = 'lead';
  } else if (claimed.waitlist_id) {
    const { data } = await client.from('waitlist').select('*').eq('id', claimed.waitlist_id).maybeSingle();
    source = data;
    sourceType = 'waitlist';
  } else if (claimed.booking_id) {
    const { data } = await client.from('bookings').select('*').eq('id', claimed.booking_id).maybeSingle();
    source = data;
    sourceType = 'booking';
  }

  const nowParts = edmontonNowParts();
  const jobTime = `${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`;
  const totalPrice = claimed.discounted_price || claimed.original_price || source?.total_price || source?.ai_price_estimate || 0;
  const bookingRef = 'JH ' + Math.random().toString(36).substring(2, 7).toUpperCase();

  const bookingRow = {
    booking_ref: bookingRef,
    name: source?.name || claimed.customer_name || 'Customer',
    phone: respondingPhone || claimed.customer_phone,
    address: source?.address || null,
    quadrant: source?.quadrant || null,
    lat: source?.lat || claimed.crew_lat || null,
    lng: source?.lng || claimed.crew_lng || null,
    load_size: source?.load_size || 'quarter',
    base_price: totalPrice,
    same_day: true,
    same_day_fee: 0,
    total_price: totalPrice,
    deposit_amount: 0,
    deposit_paid: 0,
    balance_due: totalPrice,
    job_date: nowParts.date,
    job_time: jobTime,
    job_datetime: jobDateTimeUTC(nowParts.date, jobTime).toISOString(),
    status: 'confirmed',
    crew_status: 'confirmed',
    source: 'opportunistic',
    photo_skipped: true,
  };

  const { data: newBooking, error: bookingErr } = await client.from('bookings').insert(bookingRow).select().single();

  if (bookingErr || !newBooking) {
    // Release the claim so a retry (or manual follow-up) isn't blocked.
    await client.from('nearby_offers').update({ accepted: false, responded_at: null }).eq('id', claimed.id);
    return { ok: false, reason: 'booking_insert_failed', error: bookingErr?.message };
  }

  await client.from('nearby_offers').update({ converted_booking_id: newBooking.id }).eq('id', claimed.id);

  if (sourceType === 'lead' && claimed.lead_id) {
    await client.from('leads').update({ converted_to_booking_id: newBooking.id, updated_at: now }).eq('id', claimed.lead_id);
  } else if (sourceType === 'waitlist' && claimed.waitlist_id) {
    await client.from('waitlist').update({ converted_to_booking_id: newBooking.id }).eq('id', claimed.waitlist_id);
  } else if (sourceType === 'booking' && claimed.booking_id) {
    await client.from('bookings').update({ status: 'cancelled', cancellation_reason: 'superseded_by_opportunistic_offer', updated_at: now }).eq('id', claimed.booking_id);
  }

  // Fit the new booking onto a truck. resolveDispatch handles finding/
  // creating a crew_assignment and links it to the booking internally.
  const dispatchResult = await resolveDispatch(newBooking);

  if (dispatchResult.assignment_id) {
    const { data: assignment } = await client
      .from('crew_assignments')
      .select('driver_employee_id, secondary_employee_id')
      .eq('id', dispatchResult.assignment_id)
      .maybeSingle();
    const crewIds = [assignment?.driver_employee_id, assignment?.secondary_employee_id].filter(Boolean);
    if (crewIds.length) {
      try {
        await sendPushToEmployees(crewIds, {
          title: 'New pickup added',
          body: 'A nearby customer just said YES. Check your route.',
          url: '/portal/route',
        });
      } catch { /* best-effort */ }
    }
  }

  await recordTimelineEvent({
    entity_type: 'booking',
    entity_id: newBooking.id,
    event_type: 'opportunistic_booking_created',
    actor_type: 'customer',
    source: 'sms_reply',
    reason: `Nearby offer ${claimed.id} accepted via SMS reply`,
    metadata: { offer_id: claimed.id, source_type: sourceType, dispatch: dispatchResult },
  }).catch(() => {});

  try {
    await sendSMS(bookingRow.phone, 'Great! We are on our way. Your crew will arrive shortly.', newBooking.id, 'offer_accepted');
  } catch { /* best-effort */ }

  return { ok: true, booking_id: newBooking.id, dispatch: dispatchResult };
}
