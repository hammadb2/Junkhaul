import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET /api/crew/track/[booking_id] — returns booking + latest crew location
// for the customer-facing tracking page. Public (no auth — the booking_id
// UUID is unguessable).
export async function GET(_req, { params }) {
  const { booking_id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('id, name, address, lat, lng, crew_status, job_time, job_date')
    .eq('id', booking_id)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Get the latest crew location for this booking
  const { data: crew_location } = await supabaseAdmin
    .from('crew_location')
    .select('latitude, longitude, heading, speed_kmh, updated_at')
    .eq('active_booking_id', booking_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ booking, crew_location });
}
