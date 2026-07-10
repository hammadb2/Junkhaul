import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/location — crew updates their GPS location
// Auth required. Body: { lat, lng, heading?, speed? }
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { lat, lng, heading, speed } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required (numbers)' }, { status: 400 });
  }

  const payload = {
    employee_id: emp.id,
    lat,
    lng,
    heading: typeof heading === 'number' ? heading : null,
    speed: typeof speed === 'number' ? speed : null,
    updated_at: new Date().toISOString(),
  };

  // Upsert by employee_id (one location per employee, updated in place)
  const { error } = await supabaseAdmin
    .from('crew_locations')
    .upsert(payload, { onConflict: 'employee_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// GET /api/employee/location?booking_id=XXX — public endpoint for customer tracking
// Returns the assigned crew's current location for the booking's date.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');

  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
  }

  // Look up the booking to find the job date
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, job_date')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ location: null });
  }

  // Find crew assignments for that date
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select(`
      driver_employee_id,
      secondary_employee_id
    `)
    .eq('assignment_date', booking.job_date);

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ location: null });
  }

  // Collect all assigned crew employee IDs
  const crewIds = new Set();
  for (const a of assignments) {
    if (a.driver_employee_id) crewIds.add(a.driver_employee_id);
    if (a.secondary_employee_id) crewIds.add(a.secondary_employee_id);
  }

  if (crewIds.size === 0) {
    return NextResponse.json({ location: null });
  }

  // Fetch crew locations and employee names for assigned crew
  const crewIdArray = Array.from(crewIds);

  const [locRes, empRes] = await Promise.all([
    supabaseAdmin
      .from('crew_locations')
      .select('employee_id, lat, lng, heading, speed, updated_at')
      .in('employee_id', crewIdArray),
    supabaseAdmin
      .from('employees')
      .select('id, first_name')
      .in('id', crewIdArray),
  ]);

  const locations = locRes.data || [];
  const employees = empRes.data || [];

  if (locations.length === 0) {
    return NextResponse.json({ location: null });
  }

  // Use the most recently updated location as the crew's current position
  const sorted = [...locations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const latest = sorted[0];

  // Determine if en_route (location updated within last 5 minutes)
  const updatedAgeMs = Date.now() - new Date(latest.updated_at).getTime();
  const enRoute = updatedAgeMs < 5 * 60 * 1000;

  const crewFirstNames = (employees || [])
    .map((e) => e.first_name)
    .filter(Boolean);

  return NextResponse.json({
    location: {
      lat: latest.lat,
      lng: latest.lng,
      heading: latest.heading,
      updated_at: latest.updated_at,
      crew_first_names: crewFirstNames,
      en_route: enRoute,
    },
  });
}
