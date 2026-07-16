import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/employee/collect-payment — records a payment collected by the crew.
//
// Server-side validation:
// 1. Booking must exist and belong to this employee's assignment
// 2. Pickup signature must exist for this booking
// 3. At least 3 arrival photos must exist
// 4. For cash: amount must match balance_due
// 5. For SMS link: creates a Stripe Payment Link and sends it
//
// This endpoint REJECTS payment if workflow requirements are not met.
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, method, amount, cash_received } = body;

  if (!booking_id || !method) {
    return NextResponse.json({ error: 'Missing booking_id or method' }, { status: 400 });
  }

  // ── 1. Fetch booking and verify it belongs to this crew ──
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Verify the booking belongs to this employee's crew assignment
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_id, secondary_id')
    .eq('id', booking.crew_assignment_id)
    .maybeSingle();

  if (!assignment || (assignment.driver_id !== employee.id && assignment.secondary_id !== employee.id)) {
    return NextResponse.json({ error: 'Booking not assigned to this crew' }, { status: 403 });
  }

  // ── 2. Verify pickup signature exists ──
  const { data: signature, error: sigErr } = await supabaseAdmin
    .from('customer_signatures')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle();

  if (sigErr || !signature) {
    return NextResponse.json(
      { error: 'Payment blocked: pickup signature required before collecting payment', code: 'MISSING_SIGNATURE' },
      { status: 400 }
    );
  }

  // ── 3. Verify arrival photos exist (at least 3) ──
  const { count: photoCount, error: photoErr } = await supabaseAdmin
    .from('crew_photos')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', booking_id)
    .eq('photo_type', 'arrival');

  if (photoErr || (photoCount || 0) < 3) {
    return NextResponse.json(
      { error: `Payment blocked: 3 arrival photos required (${photoCount || 0} uploaded)`, code: 'MISSING_PHOTOS' },
      { status: 400 }
    );
  }

  // ── 4. Handle payment by method ──
  const now = new Date().toISOString();

  if (method === 'cash' || method === 'cash_crew') {
    // Verify amount matches balance
    const expectedAmount = booking.balance_due ?? booking.total_price;
    if (amount !== expectedAmount) {
      return NextResponse.json(
        { error: `Amount mismatch: entered $${amount}, balance $${expectedAmount}`, code: 'AMOUNT_MISMATCH' },
        { status: 400 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'cash_crew',
        payment_method: 'cash',
        payment_collected_at: now,
        payment_collected_by: employee.id,
        cash_received: cash_received || amount,
        crew_status: 'complete',
        status: 'completed',
        receipt_sent: true,
        review_requested: true,
        review_requested_at: now,
      })
      .eq('id', booking_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Send receipt SMS
    try {
      await sendSMS(
        booking.phone,
        `Thanks ${booking.name}! $${amount} cash received for your Junk Haul Calgary pickup. We'd love a review: https://junkhaul.ca/review/${booking_id}`,
        booking_id,
        'receipt'
      );
    } catch {
      // silent — receipt is best-effort
    }

    return NextResponse.json({ ok: true, method: 'cash', amount });
  }

  if (method === 'sms_link' || method === 'sms') {
    // Send a Stripe Payment Link via SMS to the customer
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://junkhaul.ca'}/pay/${booking_id}`;

    try {
      await sendSMS(
        booking.phone,
        `Hi ${booking.name}, here's your payment link for $${booking.balance_due ?? booking.total_price}: ${paymentUrl}`,
        booking_id,
        'payment_link'
      );
    } catch {
      return NextResponse.json({ error: 'SMS failed' }, { status: 500 });
    }

    // Update booking to show payment link sent
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_link_sent_at: now,
        crew_status: 'awaiting_payment',
      })
      .eq('id', booking_id);

    return NextResponse.json({ ok: true, method: 'sms_link', message: 'Payment link sent to customer' });
  }

  if (method === 'card_on_file' || method === 'card') {
    // For card on file, we'd normally charge via Stripe
    // For now, mark as card payment pending
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_method: 'card',
        crew_status: 'awaiting_payment',
      })
      .eq('id', booking_id);

    return NextResponse.json({ ok: true, method: 'card', message: 'Card payment will be processed' });
  }

  return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
}
