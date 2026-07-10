import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// /api/track/[token]/tip — public tip endpoint (token IS auth).
//
// GET  ?amount=10  → creates a Stripe PaymentIntent for the tip
//                    and returns { client_secret } for Stripe Elements.
// POST { amount, payment_method_id } → confirms the PaymentIntent
//                    server-side and records the tip in crew_tips.
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

// POST — confirm the PaymentIntent server-side and record the tip
export async function POST(req, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const booking = await resolveBooking(token);
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { amount, payment_method_id } = body;

  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'amount must be at least $1' }, { status: 400 });
  }
  if (!payment_method_id) {
    return NextResponse.json({ error: 'payment_method_id is required' }, { status: 400 });
  }

  // Create + confirm a PaymentIntent server-side
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'cad',
    payment_method: payment_method_id,
    confirm: true,
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

  const succeeded = intent.status === 'succeeded';

  // Find the assignment for this booking's date (to link the tip)
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id')
    .eq('assignment_date', booking.job_date)
    .limit(1)
    .maybeSingle();

  const { data: tip, error: tipErr } = await supabaseAdmin
    .from('crew_tips')
    .insert({
      booking_id: booking.id,
      assignment_id: assignment?.id || null,
      amount_cad: amount,
      stripe_payment_intent_id: intent.id,
      stripe_charge_id: intent.latest_charge || null,
      status: succeeded ? 'succeeded' : intent.status,
    })
    .select()
    .single();

  if (tipErr) {
    return NextResponse.json({ error: tipErr.message }, { status: 500 });
  }

  if (!succeeded) {
    return NextResponse.json({
      ok: false,
      status: intent.status,
      tip,
      error: 'Tip payment did not succeed',
    }, { status: 402 });
  }

  return NextResponse.json({ ok: true, tip });
}
