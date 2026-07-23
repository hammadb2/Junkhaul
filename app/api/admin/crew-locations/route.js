import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/crew-locations
// Returns all crew members' current GPS positions joined with employee info.
// Used by the admin live crew map (Dispatch view).
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'admin.read', action: 'crew_locations.list' });
  if (!auth.ok) return auth.response;

  // Fetch all crew locations joined with employee data
  const { data, error } = await supabaseAdmin
    .from('crew_locations')
    .select(`
      employee_id,
      lat,
      lng,
      heading,
      speed,
      updated_at,
      employees!crew_locations_employee_id_fkey(
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter to only include locations updated in the last 10 minutes (active crews)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const activeCrews = (data || []).filter((c) => c.updated_at >= tenMinutesAgo);

  // Also fetch today's crew assignments to show which job each crew is on
  const today = new Date().toISOString().split('T')[0];
  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('crew_assignments')
    .select(`
      id,
      driver_employee_id,
      secondary_employee_id,
      assignment_date,
      bookings(id, name, address, address_data, status, job_time)
    `)
    .eq('assignment_date', today)
    .eq('status', 'active');

  if (assignmentsError) console.error('crew-locations assignment lookup failed:', assignmentsError.message);

  // Map employee_id → assignment for quick lookup
  const assignmentMap = {};
  for (const a of assignments || []) {
    if (a.driver_employee_id) assignmentMap[a.driver_employee_id] = a;
    if (a.secondary_employee_id) assignmentMap[a.secondary_employee_id] = a;
  }

  // Enrich crew locations with assignment info
  const enriched = activeCrews.map((c) => ({
    ...c,
    assignment: assignmentMap[c.employee_id] || null,
  }));

  return NextResponse.json({
    crews: enriched,
    total: enriched.length,
    timestamp: new Date().toISOString(),
  });
}
