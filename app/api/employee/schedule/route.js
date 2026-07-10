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

  // Get bookings for this date that are confirmed/scheduled
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, name, phone, address, address_data, job_date, time_slot,
      total_price, status, load_size, notes, itemized_items,
      quadrant, payment_method, payment_status
    `)
    .eq('job_date', date)
    .in('status', ['confirmed', 'scheduled', 'in_progress', 'completed'])
    .order('time_slot', { ascending: true });

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
