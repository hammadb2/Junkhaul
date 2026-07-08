import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { calcShiftGross, splitOvertime } from '@/lib/payroll';

export const runtime = 'nodejs';

// POST /api/employee/clock-out
// Body: { lat, lng }
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lat, lng } = await req.json().catch(() => ({}));

  const { data: shift } = await supabaseAdmin
    .from('timesheets')
    .select('*')
    .eq('employee_id', emp.id)
    .is('clock_out_at', null)
    .maybeSingle();
  if (!shift) {
    return NextResponse.json({ error: 'No open shift to clock out' }, { status: 404 });
  }

  const now = new Date();
  const clockIn = new Date(shift.clock_in_at);
  const hours = (now - clockIn) / 3600000;

  // Compute weekly hours already worked (Mon-Sun) excluding this open shift
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const { data: weekShifts } = await supabaseAdmin
    .from('timesheets')
    .select('clock_in_at, clock_out_at')
    .eq('employee_id', emp.id)
    .gte('clock_in_at', weekStart.toISOString())
    .not('id', 'eq', shift.id);
  let weeklyBefore = 0;
  for (const s of weekShifts || []) {
    if (s.clock_out_at) weeklyBefore += (new Date(s.clock_out_at) - new Date(s.clock_in_at)) / 3600000;
  }

  // Fetch employee pay rate
  const { data: full } = await supabaseAdmin
    .from('employees').select('pay_rate').eq('id', emp.id).maybeSingle();
  const rate = Number(full?.pay_rate || 15);

  const { regularHours, overtimeHours, regularPay, overtimePay, gross } =
    calcShiftGross({ dailyHours: hours, weeklyHoursBefore: weeklyBefore, rate, reported: true });

  const { error } = await supabaseAdmin
    .from('timesheets')
    .update({
      clock_out_at: now.toISOString(),
      clock_out_lat: lat ?? null,
      clock_out_lng: lng ?? null,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      total_hours: Math.round(hours * 100) / 100,
      gross_pay: gross,
    })
    .eq('id', shift.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    shift: {
      id: shift.id,
      clock_in_at: shift.clock_in_at,
      clock_out_at: now.toISOString(),
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      total_hours: Math.round(hours * 100) / 100,
      gross_pay: gross,
    },
  });
}
