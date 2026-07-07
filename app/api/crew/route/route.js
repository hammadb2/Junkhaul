import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';

export const runtime = 'nodejs';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;

// GET /api/crew/route?from=lat,lng&to=booking_id
// Returns the driving route geometry (GeoJSON LineString) + ETA + distance
export async function GET(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from'); // "lat,lng"
  const bookingId = searchParams.get('to');

  if (!from || !bookingId) {
    return NextResponse.json({ error: 'Missing from or to' }, { status: 400 });
  }

  // Get the booking's coordinates
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('lat, lng, address, name')
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (typeof booking.lat !== 'number' || typeof booking.lng !== 'number') {
    return NextResponse.json({ error: 'Booking has no coordinates' }, { status: 400 });
  }

  const [fromLat, fromLng] = from.split(',').map(Number);

  // Call Mapbox Directions API
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${booking.lng},${booking.lat}?access_token=${MAPBOX_TOKEN}&overview=full&geometries=geojson&steps=true&annotations=duration,distance&voice_instructions=true`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      return NextResponse.json({ error: 'Route not found' }, { status: 502 });
    }

    const route = data.routes[0];
    return NextResponse.json({
      geometry: route.geometry, // GeoJSON LineString
      distance_meters: route.distance,
      duration_seconds: route.duration,
      eta_minutes: Math.ceil(route.duration / 60),
      steps: route.legs?.[0]?.steps || [],
      destination: {
        name: booking.name,
        address: booking.address,
        lat: booking.lat,
        lng: booking.lng,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Directions API failed' }, { status: 502 });
  }
}
