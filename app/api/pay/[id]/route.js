import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createDepositPayment, isIntentReusable } from '@/lib/stripe';

export const runtime = 'nodejs';

// Returns the info + a Stripe client secret for a booking's $50 deposit.
// Creates the PaymentIntent on first load if one doesn't exist yet.
export async function GET(_req, { params }) {
  const { id } = await params;
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  if (booking.deposit_paid) {
    return NextResponse.json({ paid: true, booking: publicBooking(booking) });
  }

  let clientSecret;
  if (booking.stripe_payment_intent_id) {
    const { stripe } = await import('@/lib/stripe');
    const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    if (isIntentReusable(intent)) {
      clientSecret = intent.client_secret;
    }
    // Otherwise (canceled/expired/succeeded) fall through and create a
    // fresh intent below instead of handing back a dead client_secret the
    // customer could never actually pay (audit B8).
  }

  if (!clientSecret) {
    const intent = await createDepositPayment({
      booking_id: booking.id,
      customer_name: booking.name,
      amount_cents: 5000,
      quote_decision_id: booking.quote_decision_id || null,
    });
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', booking.id);
    clientSecret = intent.client_secret;
  }

  return NextResponse.json({
    paid: false,
    clientSecret,
    booking: publicBooking(booking),
  });
}

function publicBooking(b) {
  return {
    booking_ref: b.booking_ref,
    name: b.name,
    phone: b.phone,
    address: b.address,
    job_date: b.job_date,
    job_time: b.job_time,
    total: b.total_price,
    balance_due: b.balance_due,
  };
}
