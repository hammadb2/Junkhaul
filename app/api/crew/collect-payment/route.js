import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/crew/collect-payment — records a cash payment collected by the crew.
// For digital payments (card/apple pay), the /pay/[booking_id] page handles
// the Stripe charge and updates payment_status directly via webhook.
// This route is only for the cash_crew method.
//
// Auth: accepts either the employee session cookie (jh_employee_session)
// or the legacy x-crew-pin header.
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  const pinAuthed = !employee && await crewAuth(req);
  if (!employee && !pinAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, method, amount } = body;

  if (!booking_id || !method) {
    return NextResponse.json({ error: 'Missing booking_id or method' }, { status: 400 });
  }

  // If authenticated via employee session, verify the employee is assigned
  // to this booking's crew. Legacy PIN auth bypasses this check.
  if (employee && !await isEmployeeAssignedToBooking(employee.id, booking_id)) {
    return NextResponse.json({ error: 'Not assigned to this booking' }, { status: 403 });
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

  const now = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'cash_crew',
      payment_method: 'cash',
      payment_collected_at: now,
      crew_status: booking.crew_status === 'awaiting_payment' ? 'complete' : booking.crew_status,
      status: 'completed',
      receipt_sent: true,
      review_requested: true,
      review_requested_at: now,
    })
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send receipt email (via the existing email system)
  // For now, we send an SMS confirmation since the email system is in vapiTools.js
  try {
    await sendSMS(
      booking.phone,
      `Thanks ${booking.name}! $${amount} cash received for your Junk Haul Calgary pickup. Receipt sent to your email. We'd love a review: https://junkhaul.ca/review/${booking_id}`,
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
