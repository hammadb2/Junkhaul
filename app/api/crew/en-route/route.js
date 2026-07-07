import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/crew/en-route — crew marks they're heading to the job.
// Generates a tracking_session_id, updates crew_status, sends customer SMS
// with a live tracking link.
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

  const tracking_session_id = `ts_${booking_id}_${Date.now()}`;

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      crew_status: 'en_route',
      en_route_at: new Date().toISOString(),
      tracking_session_id,
    })
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send customer the tracking link SMS
  const trackingUrl = `https://junkhaul.ca/track/${booking_id}`;
  const etaMins = 15; // placeholder — could be computed from Mapbox
  const smsBody = `Hi ${booking.name}, the Junk Haul Calgary crew is on the way to you! Track them live: ${trackingUrl} — ETA approximately ${etaMins} minutes.`;

  try {
    await sendSMS(booking.phone, smsBody, booking_id, 'tracking');
  } catch {
    // SMS failure shouldn't block the status update
  }

  return NextResponse.json({ tracking_session_id });
}
