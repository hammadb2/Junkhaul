import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/crew/collect-payment — records a cash payment collected by the crew.
// For digital payments (card/apple pay), the /pay/[booking_id] page handles
// the Stripe charge and updates payment_status directly via webhook.
// This route is only for the cash_crew method.
//
// Auth: employee session cookie (jh_employee_session) only. The legacy
// x-crew-pin fallback was removed — the PIN-based crew app has no
// recorded usage (see docs/RELIABILITY_MASTER_PLAN.md).
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, method, amount, route_id, route_version } = body;

  if (!booking_id || !method) {
    return NextResponse.json({ error: 'Missing booking_id or method' }, { status: 400 });
  }

  // Verify the employee is assigned to this booking's crew.
  if (!await isEmployeeAssignedToBooking(employee.id, booking_id)) {
    return NextResponse.json({ error: 'Not assigned to this booking' }, { status: 403 });
  }

  // Stale-write protection: reject if route_version is stale or missing.
  const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
    isLegacyPinAuth: false,
    actionType: 'payment',
    employeeId: employee.id,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  if (method !== 'cash_crew') {
    return NextResponse.json(
      { error: 'This route only handles cash_crew. Digital payments go through /pay/[booking_id].' },
      { status: 400 }
    );
  }

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Verify amount matches balance_due
  if (amount !== booking.balance_due) {
    return NextResponse.json(
      { error: `Amount mismatch: entered $${amount}, balance $${booking.balance_due}` },
      { status: 400 }
    );
  }

  // Duplicate payment protection: reject if already paid.
  if (booking.payment_status && booking.payment_status !== 'pending' && booking.payment_status !== 'unpaid') {
    return NextResponse.json(
      { error: `Booking already paid via ${booking.payment_status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // Atomic conditional update: only update if payment_status is still
  // pending/unpaid/null. This prevents race conditions where two requests
  // pass the read check above simultaneously. If 0 rows are updated,
  // another request already collected the payment.
  //
  // We use .in() for non-null values and .is() for null, combined via .or().
  // Postgres IN clause does not match NULL, so we need the explicit .is() check.
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'cash_crew',
      payment_method: 'cash',
      payment_collected_at: now,
      crew_status: booking.crew_status === 'awaiting_payment' ? 'complete' : booking.crew_status,
      status: 'completed',
      receipt_sent: true,
      // review_requested is left false here (audit F4): it's the flag the
      // review-request cron checks before sending the real tracking/
      // feedback/tip link. Pre-setting it true at payment time made every
      // cash job permanently skip that cron -- cash customers never got
      // the real link, only the dead /review/[id] URL below.
    })
    .eq('id', booking_id)
    .or('payment_status.in.(pending,unpaid),payment_status.is.null')
    .select('id');

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // If no rows were updated, the payment was already collected by a
  // concurrent request (race condition won the read check but lost the update).
  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'Booking already paid (concurrent update prevented)' },
      { status: 409 }
    );
  }

  // Send receipt SMS. The review/tracking/tip ask is deliberately NOT
  // included here -- that's the review-request cron's job (audit F4), and
  // it already sends the real, working tracking link
  // (junkhaul.ca/track/[tracking_token]). This route previously linked to
  // https://junkhaul.ca/review/[booking_id], a route that doesn't exist.
  try {
    await sendSMS(
      booking.phone,
      `Thanks ${booking.name}! $${amount} cash received for your Junk Haul Calgary pickup. Receipt sent to your email.`,
      booking_id,
      'receipt'
    );
  } catch {
    // silent
  }

  // ── Referral fulfillment (Step 7) ──────────────────────
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

  return NextResponse.json({ ok: true });
}
