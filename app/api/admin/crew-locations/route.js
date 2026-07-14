import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

// GET /api/admin/crew-locations
// Returns all crew members' current GPS positions joined with employee info.
// Used by the admin live crew map (Dispatch view).
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        phone,
        role,
        crew_assignment_id
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter to only include locations updated in the last 10 minutes (active crews)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const activeCrews = (data || []).filter((c) => c.updated_at >= tenMinutesAgo);

  // Also fetch today's crew assignments to show which job each crew is on
  const today = new Date().toISOString().split('T')[0];
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select(`
      id,
      driver_id,
      partner_id,
      date,
      bookings(id, name, address, address_data, status, time_slot, window_label)
    `)
    .eq('date', today)
    .eq('status', 'active');

  // Map employee_id → assignment for quick lookup
  const assignmentMap = {};
  for (const a of assignments || []) {
    if (a.driver_id) assignmentMap[a.driver_id] = a;
    if (a.partner_id) assignmentMap[a.partner_id] = a;
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
