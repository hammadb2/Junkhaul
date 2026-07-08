import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/shifts — current open shift + recent shifts + period hours
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Open shift (clocked in now)
  const { data: open } = await supabaseAdmin
    .from('timesheets')
    .select('*')
    .eq('employee_id', emp.id)
    .is('clock_out_at', null)
    .maybeSingle();

  // Recent shifts (last 30)
  const { data: recent } = await supabaseAdmin
    .from('timesheets')
    .select('id, clock_in_at, clock_out_at, regular_hours, overtime_hours, total_hours, gross_pay, pay_run_id')
    .eq('employee_id', emp.id)
    .not('clock_out_at', 'is', null)
    .order('clock_in_at', { ascending: false })
    .limit(30);

  // Hours this pay period (current calendar month as a rough proxy until a
  // pay run boundary is configured)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: periodShifts } = await supabaseAdmin
    .from('timesheets')
    .select('regular_hours, overtime_hours, total_hours, gross_pay')
    .eq('employee_id', emp.id)
    .not('clock_out_at', 'is', null)
    .is('pay_run_id', null)
    .gte('clock_in_at', monthStart.toISOString());

  const period = (periodShifts || []).reduce((a, s) => ({
    regular_hours: a.regular_hours + Number(s.regular_hours || 0),
    overtime_hours: a.overtime_hours + Number(s.overtime_hours || 0),
    total_hours: a.total_hours + Number(s.total_hours || 0),
    gross: a.gross + Number(s.gross_pay || 0),
  }), { regular_hours: 0, overtime_hours: 0, total_hours: 0, gross: 0 });

  return NextResponse.json({
    open_shift: open || null,
    recent: recent || [],
    period: {
      regular_hours: Math.round(period.regular_hours * 100) / 100,
      overtime_hours: Math.round(period.overtime_hours * 100) / 100,
      total_hours: Math.round(period.total_hours * 100) / 100,
      gross: Math.round(period.gross * 100) / 100,
    },
  });
}
