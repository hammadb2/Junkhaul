import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// POST /api/track/[token]/feedback — public endpoint.
// Saves customer star rating + review to customer_feedback table.
// The token IS the auth.
// Body: { rating, review_text, name }
// ============================================================
export async function POST(req, { params }) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { rating, review_text, name } = body;

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be a number between 1 and 5' }, { status: 400 });
  }

  // Resolve booking by tracking_token (or id if UUID)
  let q = supabaseAdmin.from('bookings').select('id');
  if (UUID_RE.test(token)) q = q.eq('id', token);
  else q = q.eq('tracking_token', token);
  const { data: booking, error } = await q.maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Idempotent: if feedback already exists, return it
  const { data: existing } = await supabaseAdmin
    .from('customer_feedback')
    .select('*')
    .eq('booking_id', booking.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, feedback: existing, already_submitted: true });
  }

  const { data: feedback, error: insertErr } = await supabaseAdmin
    .from('customer_feedback')
    .insert({
      booking_id: booking.id,
      rating,
      review_text: review_text || null,
      reviewer_name: name || null,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, feedback });
}
