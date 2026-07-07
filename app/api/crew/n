import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';

// GET /api/crew/nearby-opportunities — finds waitlist customers and future
// bookings within 3km of the crew's current position.
// Requires the crew to have an active tracking session (crew_location row).
export async function GET(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the crew's latest position
  const { data: loc } = await supabaseAdmin
    .from('crew_location')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!loc) {
    return NextResponse.json({ opportunities: [] });
  }

  const crewLat = loc.latitude;
  const crewLng = loc.longitude;

  // Find waitlist entries within 3km that have lat/lng and haven't been
  // offered today
  const { data: waitlist } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('offered_nearby_today', false)
    .is('converted_to_booking_id', null)
    .gt('expires_at', new Date().toISOString());

  // Find future-day confirmed bookings within 3km
  const { date: todayStr } = edmontonNowParts();
  const { data: futureBookings } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .neq('job_date', todayStr)
    .eq('status', 'confirmed')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('opportunistic', false);

  const opportunities = [];

  for (const entry of waitlist || []) {
    const dist = haversineKm(crewLat, crewLng, entry.lat, entry.lng);
    if (dist <= 3.0) {
      opportunities.push({
        waitlist_id: entry.id,
        booking_id: null,
        customer_type: 'waitlist',
        name: entry.name,
        phone: entry.phone,
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
        distance_km: dist,
        load_size: entry.load_size,
        joined_at: entry.created_at,
      });
    }
  }

  for (const booking of futureBookings || []) {
    const dist = haversineKm(crewLat, crewLng, booking.lat, booking.lng);
    if (dist <= 3.0) {
      opportunities.push({
        booking_id: booking.id,
        waitlist_id: null,
        customer_type: 'future_booking',
        name: booking.name,
        phone: booking.phone,
        address: booking.address,
        lat: booking.lat,
        lng: booking.lng,
        distance_km: dist,
        load_size: booking.load_size,
        joined_at: booking.created_at,
      });
    }
  }

  // Sort by distance
  opportunities.sort((a, b) => a.distance_km - b.distance_km);

  return NextResponse.json({ opportunities });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
