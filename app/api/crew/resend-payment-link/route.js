import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/crew/resend-payment-link — sends the customer an SMS with a link
// to the /pay/[booking_id] page where they can pay on their own device.
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id } = body;
  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
  }

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const payUrl = `https://junkhaul.ca/pay/${booking_id}`;
  const smsBody = `Hi ${booking.name}, here's your payment link for your Junk Haul Calgary pickup today. Balance due: $${booking.balance_due}. Pay here: ${payUrl}`;

  try {
    await sendSMS(booking.phone, smsBody, booking_id, 'payment_link');
  } catch (err) {
    return NextResponse.json({ error: 'SMS failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
