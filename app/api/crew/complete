import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';

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

  return NextResponse.json({ ok: true, crew_status: newStatus });
}
