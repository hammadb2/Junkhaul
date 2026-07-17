import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkCronSecret } from '@/lib/cronAuth';
import { calculatePayRun, PAY_PERIODS } from '@/lib/payroll';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/admin/payroll/run — calculate AND persist the pay run + stubs.
// Marks the included shifts as paid (pay_run_id set). Status -> 'calculated'.
// Body: { period_start, period_end, P? }
export async function POST(req) {
  const cron = checkCronSecret(req);
  let auth = null;
  if (!cron) {
    auth = await requireStaffPermission(req, {
      permission: 'payroll.generate',
      ownerOnly: true,
      action: 'payroll.generate',
      metadata: { route: '/api/admin/payroll/run' },
    });
    if (!auth.ok) return auth.response;
  }
  const { period_start, period_end, P = PAY_PERIODS.biweekly, reason = null } = await req.json();
  if (!period_start || !period_end) {
    return NextResponse.json({ error: 'period_start and period_end required' }, { status: 422 });
  }

  // Gather un-paid shifts
  const { data: shifts } = await supabaseAdmin
    .from('timesheets')
    .select('id, employee_id, regular_hours, overtime_hours, total_hours, gross_pay')
    .is('pay_run_id', null)
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', period_start)
    .lte('clock_in_at', period_end + 'T23:59:59');

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ error: 'No un-paid shifts in this period' }, { status: 400 });
  }

  // Aggregate per employee
  const byEmp = new Map();
  const shiftIdsByEmp = new Map();
  for (const s of shifts) {
    const cur = byEmp.get(s.employee_id) || { employee_id: s.employee_id, regularHours: 0, overtimeHours: 0, totalHours: 0, gross: 0 };
    cur.regularHours += Number(s.regular_hours || 0);
    cur.overtimeHours += Number(s.overtime_hours || 0);
    cur.totalHours += Number(s.total_hours || 0);
    cur.gross += Number(s.gross_pay || 0);
    byEmp.set(s.employee_id, cur);
    const ids = shiftIdsByEmp.get(s.employee_id) || [];
    ids.push(s.id);
    shiftIdsByEmp.set(s.employee_id, ids);
  }
  const entries = [...byEmp.values()].map((e) => ({
    ...e,
    regularHours: Math.round(e.regularHours * 100) / 100,
    overtimeHours: Math.round(e.overtimeHours * 100) / 100,
    totalHours: Math.round(e.totalHours * 100) / 100,
    gross: Math.round(e.gross * 100) / 100,
  }));

  const run = await calculatePayRun({
    entries,
    periodStart: period_start,
    periodEnd: period_end,
    P,
    payDate: new Date(),
  });

  // Persist pay run
  const { data: payRun, error: runErr } = await supabaseAdmin
    .from('pay_runs')
    .insert({
      period_start: period_start,
      period_end: period_end,
      status: 'calculated',
      edition: run.edition,
      total_gross: run.totals.total_gross,
      total_cpp: run.totals.total_cpp,
      total_cpp2: run.totals.total_cpp2,
      total_ei: run.totals.total_ei,
      total_fed_tax: run.totals.total_fed_tax,
      total_vacation: run.totals.total_vacation,
      total_net: run.totals.total_net,
      total_cra_remittance: run.totals.total_cra_remittance,
      remittance_due_date: run.totals.remittance_due_date,
    })
    .select()
    .single();
  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });

  // Persist stubs
  const stubRows = run.stubs.map((s) => ({ ...s, pay_run_id: payRun.id }));
  const { data: insertedStubs, error: stubErr } = await supabaseAdmin
    .from('pay_stubs').insert(stubRows).select('id, employee_id');
  if (stubErr) return NextResponse.json({ error: stubErr.message }, { status: 500 });

  // Tag shifts with pay_run_id
  const stubByEmp = new Map((insertedStubs || []).map((s) => [s.employee_id, s.id]));
  for (const [empId, shiftIds] of shiftIdsByEmp) {
    await supabaseAdmin.from('timesheets')
      .update({ pay_run_id: payRun.id })
      .in('id', shiftIds);
  }

  // Create remittance record
  await supabaseAdmin.from('remittances').insert({
    pay_run_id: payRun.id,
    due_date: run.totals.remittance_due_date,
    amount: run.totals.total_cra_remittance,
    status: 'owed',
  });

  if (!cron) {
    await auditSensitiveAttempt({
      context: auth.context,
      allowed: true,
      permission: 'payroll.generate',
      entityType: 'pay_run',
      entityId: payRun.id,
      action: 'payroll.generate',
      reason,
      after: { period_start, period_end, status: 'calculated', total_net: run.totals.total_net },
      metadata: { shift_count: shifts.length, employee_count: entries.length },
    });
  }

  return NextResponse.json({ ok: true, pay_run_id: payRun.id, pay_run: { ...run, id: payRun.id } });
}
