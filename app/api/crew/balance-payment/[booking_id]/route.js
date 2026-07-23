import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe, isIntentReusable } from '@/lib/stripe';

export const runtime = 'nodejs';

// GET /api/crew/balance-payment/[booking_id] — returns balance payment info
// for the customer-facing /pay/[booking_id] page.
export async function GET(_req, { params }) {
  const { booking_id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.payment_status !== 'unpaid') {
    return NextResponse.json({
      paid: true,
      payment_status: booking.payment_status,
      booking: publicBooking(booking),
    });
  }

  const balance = booking.balance_due || 0;
  if (balance <= 0) {
    return NextResponse.json({ paid: true, booking: publicBooking(booking) });
  }

  let clientSecret;
  const metadata = {
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    customer_name: booking.name,
    type: 'balance',
  };

  // Uses its own column (audit F7) -- stripe_payment_intent_id is the
  // DEPOSIT intent, read by app/api/pay/[id] to resume an in-progress
  // deposit payment and by lib/cancellations.js to issue the deposit
  // refund on cancellation. Overwriting it with a balance intent silently
  // broke both of those.
  if (booking.stripe_balance_payment_intent_id) {
    try {
      const intent = await stripe.paymentIntents.retrieve(booking.stripe_balance_payment_intent_id);
      if (isIntentReusable(intent)) {
        clientSecret = intent.client_secret;
      }
    } catch {
      // create new
    }
  }

  if (!clientSecret) {
    const intent = await stripe.paymentIntents.create({
      amount: balance * 100,
      currency: 'cad',
      description: `Junk Haul Calgary balance — ${booking.booking_ref}`,
      statement_descriptor: 'JUNK HAUL CALGARY',
      statement_descriptor_suffix: 'BALANCE',
      receipt_email: booking.email || undefined,
      metadata,
      automatic_payment_methods: { enabled: true },
      allow_redirects: 'never',
    });

    await supabaseAdmin
      .from('bookings')
      .update({ stripe_balance_payment_intent_id: intent.id })
      .eq('id', booking.id);

    clientSecret = intent.client_secret;
  }

  return NextResponse.json({
    paid: false,
    clientSecret,
    booking: publicBooking(booking),
  });
}

// POST — customer declared cash on the payment page
export async function POST(req, { params }) {
  const { booking_id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.action === 'declare_cash') {
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ payment_status: 'cash_declared' })
      .eq('id', booking_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function publicBooking(b) {
  return {
    booking_ref: b.booking_ref,
    name: b.name,
    address: b.address,
    job_date: b.job_date,
    job_time: b.job_time,
    total: b.total_price,
    deposit_paid: b.deposit_amount,
    balance_due: b.balance_due,
    email: b.email,
  };
}
