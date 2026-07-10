import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/job-clock — clock in/out for a specific job
// Auto-manages the employee's shift timesheet: clocks in when first job
// starts, clocks out when last job ends.
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { booking_id, assignment_id, action } = body;
  // action: 'in' or 'out'

  if (!booking_id || !action) {
    return NextResponse.json({ error: 'booking_id and action are required' }, { status: 400 });
  }

  if (action === 'in') {
    // Check if already clocked in for this booking
    const { data: existing } = await supabaseAdmin
      .from('job_clock_sessions')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('booking_id', booking_id)
      .is('clock_out_at', null)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Already clocked in for this job' }, { status: 409 });

    // Auto clock-in the shift timesheet if not already clocked in
    const { data: openShift } = await supabaseAdmin
      .from('timesheets')
      .select('id')
      .eq('employee_id', emp.id)
      .is('clock_out_at', null)
      .maybeSingle();
    if (!openShift) {
      await supabaseAdmin.from('timesheets').insert({
        employee_id: emp.id,
        clock_in_at: new Date().toISOString(),
      });
    }

    const { data, error } = await supabaseAdmin
      .from('job_clock_sessions')
      .insert({
        booking_id,
        assignment_id: assignment_id || null,
        employee_id: emp.id,
        clock_in_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update booking status to in_progress
    await supabaseAdmin.from('bookings').update({ status: 'in_progress' }).eq('id', booking_id);

    return NextResponse.json({ ok: true, session: data });
  }

  if (action === 'out') {
    const { data: session } = await supabaseAdmin
      .from('job_clock_sessions')
      .select('id, clock_in_at')
      .eq('employee_id', emp.id)
      .eq('booking_id', booking_id)
      .is('clock_out_at', null)
      .maybeSingle();
    if (!session) return NextResponse.json({ error: 'No active clock session for this job' }, { status: 404 });

    const now = new Date().toISOString();
    const duration = Math.round((new Date(now).getTime() - new Date(session.clock_in_at).getTime()) / 60000);

    const { error } = await supabaseAdmin
      .from('job_clock_sessions')
      .update({ clock_out_at: now, duration_minutes: duration })
      .eq('id', session.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto clock-out the shift if no more open job sessions
    const { data: remainingOpen } = await supabaseAdmin
      .from('job_clock_sessions')
      .select('id')
      .eq('employee_id', emp.id)
      .is('clock_out_at', null);
    if (!remainingOpen || remainingOpen.length === 0) {
      // Calculate shift hours and clock out
      const { data: shift } = await supabaseAdmin
        .from('timesheets')
        .select('id, clock_in_at')
        .eq('employee_id', emp.id)
        .is('clock_out_at', null)
        .maybeSingle();
      if (shift) {
        const clockInTime = new Date(shift.clock_in_at).getTime();
        const clockOutTime = new Date(now).getTime();
        const totalMinutes = Math.round((clockOutTime - clockInTime) / 60000);
        const regularHours = Math.min(totalMinutes / 60, 8);
        const overtimeHours = Math.max(0, (totalMinutes / 60) - 8);
        const totalHours = totalMinutes / 60;
        const grossPay = (regularHours * Number(emp.pay_rate || 0)) + (overtimeHours * Number(emp.pay_rate || 0) * 1.5);

        await supabaseAdmin.from('timesheets').update({
          clock_out_at: now,
          regular_hours: Math.round(regularHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          total_hours: Math.round(totalHours * 100) / 100,
          gross_pay: Math.round(grossPay * 100) / 100,
        }).eq('id', shift.id);
      }
    }

    return NextResponse.json({ ok: true, duration_minutes: duration });
  }

  return NextResponse.json({ error: 'Invalid action. Use "in" or "out"' }, { status: 400 });
}
