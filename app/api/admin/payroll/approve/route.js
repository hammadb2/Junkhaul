import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendDirectDeposit, isDirectDepositConfigured } from '@/lib/directDeposit';
import { sendSMS } from '@/lib/sms';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/admin/payroll/list — all pay runs (newest first)
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'payroll.preview',
    ownerOnly: true,
    action: 'payroll.list',
    metadata: { route: '/api/admin/payroll/approve', method: 'GET' },
  });
  if (!auth.ok) return auth.response;
  const { data: runs } = await supabaseAdmin
    .from('pay_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json({ pay_runs: runs || [] });
}

// POST /api/admin/payroll/approve — approve a calculated run, then
// optionally trigger direct deposit for each stub.
// Body: { pay_run_id, send_direct_deposit?: boolean }
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { pay_run_id, send_direct_deposit, reason } = body;
  const permission = send_direct_deposit ? 'payroll.send' : 'payroll.approve';
  const auth = await requireStaffPermission(req, {
    permission,
    ownerOnly: true,
    entityType: 'pay_run',
    entityId: pay_run_id || null,
    action: send_direct_deposit ? 'payroll.send' : 'payroll.approve',
    reason,
    metadata: { send_direct_deposit: !!send_direct_deposit },
  });
  if (!auth.ok) return auth.response;
  if (!pay_run_id) return NextResponse.json({ error: 'pay_run_id required' }, { status: 422 });

  const { data: run } = await supabaseAdmin
    .from('pay_runs').select('*').eq('id', pay_run_id).maybeSingle();
  if (!run) return NextResponse.json({ error: 'Pay run not found' }, { status: 404 });
  if (run.status !== 'calculated') {
    return NextResponse.json({ error: `Pay run status is '${run.status}', must be 'calculated' to approve` }, { status: 409 });
  }

  await supabaseAdmin.from('pay_runs')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: auth.context.employee.id })
    .eq('id', pay_run_id);

  let depositResults = [];
  if (send_direct_deposit) {
    if (!isDirectDepositConfigured()) {
      await auditSensitiveAttempt({
        context: auth.context,
        allowed: true,
        permission,
        entityType: 'pay_run',
        entityId: pay_run_id,
        action: 'payroll.approve_without_direct_deposit',
        reason,
        before: run,
        after: { status: 'approved' },
        metadata: { send_direct_deposit: true, direct_deposit_configured: false },
      });
      return NextResponse.json({ ok: true, approved: true, warning: 'Direct deposit not configured — approved but no EFT sent' });
    }
    const { data: stubs } = await supabaseAdmin
      .from('pay_stubs').select('*').eq('pay_run_id', pay_run_id);
    for (const stub of stubs || []) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('*').eq('id', stub.employee_id).maybeSingle();
      if (!emp || !emp.bank_account_enc) {
        depositResults.push({ employee_id: stub.employee_id, ok: false, error: 'No banking info on file' });
        continue;
      }
      const res = await sendDirectDeposit({ payStub: stub, employee: emp });
      depositResults.push({ employee_id: stub.employee_id, ...res });
    }
    const allSent = depositResults.every((r) => r.ok);
    await supabaseAdmin.from('pay_runs')
      .update({ status: allSent ? 'paid' : 'approved', paid_at: allSent ? new Date().toISOString() : null })
      .eq('id', pay_run_id);
  }

  await auditSensitiveAttempt({
    context: auth.context,
    allowed: true,
    permission,
    entityType: 'pay_run',
    entityId: pay_run_id,
    action: send_direct_deposit ? 'payroll.send' : 'payroll.approve',
    reason,
    before: run,
    after: { status: send_direct_deposit && depositResults.every((r) => r.ok) ? 'paid' : 'approved' },
    metadata: { send_direct_deposit: !!send_direct_deposit, deposit_results_count: depositResults.length },
  });

  // ── Notify each employee that their pay stub is ready ──
  try {
    const { data: stubs } = await supabaseAdmin
      .from('pay_stubs')
      .select('id, employee_id, net_pay')
      .eq('pay_run_id', pay_run_id);

    for (const stub of stubs || []) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('phone, name')
        .eq('id', stub.employee_id)
        .maybeSingle();
      if (!emp?.phone) continue;

      const periodLabel = `${run.period_start} to ${run.period_end}`;
      const portalLink = 'https://junkhaul.ca/portal/paystubs';
      const netFormatted = Number(stub.net_pay || 0).toFixed(2);
      await sendSMS(
        emp.phone,
        `Your pay stub for ${periodLabel} is ready — $${netFormatted} net. View it at ${portalLink}`,
        null,
        'pay_stub_ready'
      ).catch(() => {}); // best-effort — don't fail approval over an SMS
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, approved: true, deposits: depositResults });
}
