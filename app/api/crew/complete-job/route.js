import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/crew/complete-job — marks job done after completion photos.
// Sets crew_status to awaiting_payment (if not yet paid) or complete (if paid).
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, route_id, route_version } = body;
  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
  }

  const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
    isLegacyPinAuth: true,
    actionType: 'job_completion',
    employeeId: undefined,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Verify at least 3 completion photos exist
  const completionPhotos = (booking.crew_photos || []).filter((p) => p.type === 'completion');
  if (completionPhotos.length < 3) {
    return NextResponse.json(
      { error: `Need at least 3 completion photos (have ${completionPhotos.length})` },
      { status: 400 }
    );
  }

  const isPaid = booking.payment_status !== 'unpaid';
  const newStatus = isPaid ? 'complete' : 'awaiting_payment';

  const updatePayload = { crew_status: newStatus };
  if (isPaid) {
    updatePayload.status = 'completed';
  }

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update(updatePayload)
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Review request (Step 4) ────────────────────────────
  // Send a review request at the highest-goodwill moment:
  // immediately after job completion + payment cleared.
  // Only send once (guarded by review_requested flag).
  if (isPaid && !booking.review_requested) {
    try {
      const trackingId = booking.tracking_token || booking_id;
      const trackingUrl = `https://junkhaul.ca/track/${trackingId}`;
      const reviewMsg = `Your junk removal is complete! Track where your items went, leave feedback, and tip your crew: ${trackingUrl}`;
      await sendSMS(booking.phone, reviewMsg, booking_id, 'review_request');
      await supabaseAdmin
        .from('bookings')
        .update({
          review_requested: true,
          review_requested_at: new Date().toISOString(),
        })
        .eq('id', booking_id);
    } catch {
      // best-effort — don't fail the completion over a review SMS
    }

    // ── Referral fulfillment (Step 7) ─────────────────────
    // If this booking had a referral code, fulfill the reward.
    if (booking.referral_code) {
      try {
        await fetch(`${req.nextUrl.origin}/api/referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fulfill', booking_id }),
        });
      } catch {
        // best-effort
      }
    }
  }

  return NextResponse.json({ ok: true, crew_status: newStatus });
}
