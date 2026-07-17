import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculatePayRun, PAY_PERIODS } from '@/lib/payroll';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ------------------------------------------------------------
// Gather un-paid shifts for a period and build payroll entries.
// ------------------------------------------------------------
async function gatherEntries(periodStart, periodEnd) {
  const { data: shifts } = await supabaseAdmin
    .from('timesheets')
    .select('employee_id, regular_hours, overtime_hours, total_hours, gross_pay')
    .is('pay_run_id', null)
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', periodStart)
    .lte('clock_in_at', periodEnd + 'T23:59:59');

  // Aggregate per employee
  const byEmp = new Map();
  for (const s of shifts || []) {
    const cur = byEmp.get(s.employee_id) || { employee_id: s.employee_id, regularHours: 0, overtimeHours: 0, totalHours: 0, gross: 0 };
    cur.regularHours += Number(s.regular_hours || 0);
    cur.overtimeHours += Number(s.overtime_hours || 0);
    cur.totalHours += Number(s.total_hours || 0);
    cur.gross += Number(s.gross_pay || 0);
    byEmp.set(s.employee_id, cur);
  }
  return [...byEmp.values()].map((e) => ({
    ...e,
    regularHours: Math.round(e.regularHours * 100) / 100,
    overtimeHours: Math.round(e.overtimeHours * 100) / 100,
    totalHours: Math.round(e.totalHours * 100) / 100,
    gross: Math.round(e.gross * 100) / 100,
  }));
}

// POST /api/admin/payroll/preview — calculate without saving.
// Body: { period_start, period_end, P? }
export async function POST(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'payroll.preview',
    ownerOnly: true,
    action: 'payroll.preview',
    metadata: { route: '/api/admin/payroll/preview' },
  });
  if (!auth.ok) return auth.response;
  const { period_start, period_end, P = PAY_PERIODS.biweekly } = await req.json();
  if (!period_start || !period_end) {
    return NextResponse.json({ error: 'period_start and period_end required' }, { status: 422 });
  }

  const entries = await gatherEntries(period_start, period_end);
  if (entries.length === 0) {
    return NextResponse.json({ pay_run: null, message: 'No un-paid shifts in this period' });
  }

  const run = await calculatePayRun({
    entries,
    periodStart: period_start,
    periodEnd: period_end,
    P,
    payDate: new Date(),
  });

  return NextResponse.json({ pay_run: run });
}
