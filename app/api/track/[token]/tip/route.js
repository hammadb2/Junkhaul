import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// /api/track/[token]/tip — public tip endpoint (token IS auth).
//
// GET ?amount=10 → creates a Stripe PaymentIntent for the tip and
// returns { client_secret }. The customer confirms it directly
// client-side via Stripe Elements (app/track/[token]/page.js
// TipSection, stripe.confirmPayment) -- there is no separate
// server-side confirm step here. The actual crew_tips row is
// inserted by the Stripe webhook on payment_intent.succeeded
// (see app/api/stripe-webhook/route.js), not by this route, since
// that's the only step guaranteed to run regardless of what happens
// to the customer's browser after Stripe confirms the charge.
//
// A previous POST handler here duplicated that recording (and, since
// nothing ever called it, was dead code -- audit F5) by creating a
// SECOND PaymentIntent server-side and confirming it directly with a
// client-supplied payment_method_id. It was removed rather than
// fixed in place.
// ============================================================

async function resolveBooking(token) {
  let q = supabaseAdmin.from('bookings').select('id, booking_ref, name, email, job_date');
  if (UUID_RE.test(token)) q = q.eq('id', token);
  else q = q.eq('tracking_token', token);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return data;
}

// GET — create a PaymentIntent for the tip amount
export async function GET(req, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const booking = await resolveBooking(token);
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const amount = parseFloat(searchParams.get('amount'));
  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'amount must be at least $1' }, { status: 400 });
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'cad',
    description: `Junk Haul Calgary crew tip — ${booking.booking_ref}`,
    statement_descriptor: 'JUNK HAUL CALGARY',
    statement_descriptor_suffix: 'CREW TIP',
    receipt_email: booking.email || undefined,
    metadata: {
      booking_id: booking.id,
      booking_ref: booking.booking_ref,
      customer_name: booking.name || '',
      type: 'tip',
    },
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });

  return NextResponse.json({ client_secret: intent.client_secret, amount });
}
