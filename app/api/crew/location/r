import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';

export const runtime = 'nodejs';

// POST /api/crew/location — update crew GPS position
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    latitude,
    longitude,
    heading,
    speed_kmh,
    accuracy_meters,
    active_booking_id,
    tracking_session_id,
  } = body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  if (!tracking_session_id) {
    return NextResponse.json({ error: 'Missing tracking_session_id' }, { status: 400 });
  }

  // Upsert by tracking_session_id
  const { error } = await supabaseAdmin
    .from('crew_location')
    .upsert(
      {
        tracking_session_id,
        latitude,
        longitude,
        heading: heading ?? null,
        speed_kmh: speed_kmh ?? null,
        accuracy_meters: accuracy_meters ?? null,
        active_booking_id: active_booking_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tracking_session_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
