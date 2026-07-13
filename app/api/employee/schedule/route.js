import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/schedule — today's assignment + bookings for the crew
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const weekly = searchParams.get('weekly') === 'true';

  // Weekly view: return assignments + bookings for the current week (Mon-Sun)
  if (weekly) {
    const now = new Date(date + 'T00:00:00');
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const dateStr = (d) => d.toISOString().slice(0, 10);
    const startDate = dateStr(monday);
    const endDate = dateStr(sunday);

    const { data: assignments } = await supabaseAdmin
      .from('crew_assignments')
      .select(`
        id, assignment_date, uhaul_location,
        driver:driver_employee_id (id, name, first_name, last_name),
        secondary:secondary_employee_id (id, name, first_name, last_name)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate)
      .or(`driver_employee_id.eq.${emp.id},secondary_employee_id.eq.${emp.id}`)
      .order('assignment_date', { ascending: true });

    const { data: weekBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, name, address, job_date, time_slot, total_price, status, load_size')
      .gte('job_date', startDate)
      .lte('job_date', endDate)
      .in('status', ['confirmed', 'scheduled', 'in_progress', 'completed'])
      .order('job_date', { ascending: true })
      .order('time_slot', { ascending: true });

    // Group by date
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = dateStr(d);
      days.push({
        date: ds,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: ds === new Date().toISOString().slice(0, 10),
        assignment: (assignments || []).find((a) => a.assignment_date === ds) || null,
        bookings: (weekBookings || []).filter((b) => b.job_date === ds),
      });
    }

    return NextResponse.json({ week: days, startDate, endDate });
  }

  // Find today's crew assignment where this employee is driver or secondary
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select(`
      *,
      driver:driver_employee_id (id, name, first_name, last_name, phone),
      secondary:secondary_employee_id (id, name, first_name, last_name, phone)
    `)
    .eq('assignment_date', date)
    .or(`driver_employee_id.eq.${emp.id},secondary_employee_id.eq.${emp.id}`)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ assignment: null, bookings: [], partner: null });
  }

  // Get bookings for this date that are confirmed/scheduled.
  // When the employee has a crew_assignment, filter to only their truck's
  // bookings (multi-truck support). If no assignment or backward-compat
  // (bookings without crew_assignment_id), show all for the date.
  let bookingsQuery = supabaseAdmin
    .from('bookings')
    .select(`
      id, name, phone, address, address_data, job_date, time_slot,
      total_price, status, load_size, notes, itemized_items,
      quadrant, payment_method, payment_status, crew_assignment_id
    `)
    .eq('job_date', date)
    .in('status', ['confirmed', 'scheduled', 'in_progress', 'completed']);

  // If the employee has an assignment, filter to their truck's bookings.
  // Also include unassigned bookings (crew_assignment_id is null) so
  // legacy bookings still show up.
  if (assignment) {
    bookingsQuery = bookingsQuery.or(`crew_assignment_id.eq.${assignment.id},crew_assignment_id.is.null`);
  }

  const { data: bookings } = await bookingsQuery.order('time_slot', { ascending: true });

  // Partner info
  const partnerId = assignment.driver_employee_id === emp.id
    ? assignment.secondary_employee_id
    : assignment.driver_employee_id;
  let partner = null;
  if (partnerId) {
    const { data: p } = await supabaseAdmin
      .from('employees')
      .select('id, name, first_name, last_name, phone')
      .eq('id', partnerId)
      .maybeSingle();
    partner = p;
  }

  // Open job clock sessions for this employee today
  const { data: openSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, booking_id, clock_in_at')
    .eq('employee_id', emp.id)
    .is('clock_out_at', null);

  // Completed sessions today
  const { data: completedSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, booking_id, clock_in_at, clock_out_at, duration_minutes')
    .eq('employee_id', emp.id)
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', `${date}T00:00:00`)
    .lte('clock_in_at', `${date}T23:59:59`);

  // Open shift (for clock-in indicator)
  const { data: openShift } = await supabaseAdmin
    .from('timesheets')
    .select('id, clock_in_at')
    .eq('employee_id', emp.id)
    .is('clock_out_at', null)
    .maybeSingle();

  return NextResponse.json({
    assignment,
    partner,
    bookings: bookings || [],
    open_sessions: openSessions || [],
    completed_sessions: completedSessions || [],
    open_shift: openShift || null,
  });
}
