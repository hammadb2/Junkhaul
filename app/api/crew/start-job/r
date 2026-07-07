import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/crew/start-job — marks job in_progress after arrival photos are
// uploaded. Sends the customer a link to view the pre-job photos.
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

  // Verify at least 3 arrival photos exist
  const arrivalPhotos = (booking.crew_photos || []).filter((p) => p.type === 'arrival');
  if (arrivalPhotos.length < 3) {
    return NextResponse.json(
      { error: `Need at least 3 arrival photos (have ${arrivalPhotos.length})` },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      crew_status: 'in_progress',
      job_started_at: new Date().toISOString(),
    })
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send customer the pre-job photo link
  const photoUrl = `https://junkhaul.ca/photos/${booking_id}/arrival`;
  try {
    await sendSMS(
      booking.phone,
      `Hi ${booking.name}, the Junk Haul Calgary crew has arrived. Here are photos of your space taken before we start: ${photoUrl}`,
      booking_id,
      'photos_arrival'
    );
  } catch {
    // silent
  }

  return NextResponse.json({ ok: true });
}
