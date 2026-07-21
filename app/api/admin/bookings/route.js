import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts } from '@/lib/dates';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/bookings?date=YYYY-MM-DD  (defaults to next operating day view)
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'admin.read', action: 'bookings.list' });
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const today = edmontonNowParts().date;

  let query = supabaseAdmin
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'rescheduled', 'completed', 'no_show'])
    .order('job_date', { ascending: true })
    .order('job_time', { ascending: true });

  if (date) {
    query = query.eq('job_date', date);
  } else {
    query = query.gte('job_date', today);
  }

  const { data: bookings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Denormalize assigned crew names onto each booking so the Dispatch job
  // list can show who's on a job without cross-referencing the live map.
  const assignmentIds = [...new Set((bookings || []).map((b) => b.crew_assignment_id).filter(Boolean))];
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabaseAdmin
      .from('crew_assignments')
      .select('id, driver_employee_id, secondary_employee_id')
      .in('id', assignmentIds);
    const employeeIds = [...new Set((assignments || []).flatMap((a) => [a.driver_employee_id, a.secondary_employee_id]).filter(Boolean))];
    let employeesById = {};
    if (employeeIds.length > 0) {
      const { data: employees } = await supabaseAdmin.from('employees').select('id, name, first_name, last_name').in('id', employeeIds);
      employeesById = Object.fromEntries((employees || []).map((e) => [e.id, e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Crew']));
    }
    const assignmentsById = Object.fromEntries((assignments || []).map((a) => [a.id, a]));
    for (const b of bookings) {
      const a = b.crew_assignment_id ? assignmentsById[b.crew_assignment_id] : null;
      b.assigned_crew_names = a
        ? [a.driver_employee_id, a.secondary_employee_id].filter(Boolean).map((id) => employeesById[id]).filter(Boolean)
        : [];
    }
  } else {
    for (const b of bookings) b.assigned_crew_names = [];
  }

  // Simple stats across the returned set.
  const stats = {
    jobs: bookings.length,
    revenue: bookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
    completed: bookings.filter((b) => b.status === 'completed').length,
    flagged: bookings.filter((b) => b.flag_for_review).length,
    high_risk: bookings.filter((b) => (b.no_show_risk_score || 0) >= 50).length,
  };

  return NextResponse.json({ bookings, stats });
}
