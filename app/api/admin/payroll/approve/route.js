import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { sendDirectDeposit, isDirectDepositConfigured } from '@/lib/directDeposit';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

// GET /api/admin/payroll/list — all pay runs (newest first)
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { pay_run_id, send_direct_deposit } = await req.json();
  if (!pay_run_id) return NextResponse.json({ error: 'pay_run_id required' }, { status: 400 });

  const { data: run } = await supabaseAdmin
    .from('pay_runs').select('*').eq('id', pay_run_id).maybeSingle();
  if (!run) return NextResponse.json({ error: 'Pay run not found' }, { status: 404 });
  if (run.status !== 'calculated') {
    return NextResponse.json({ error: `Pay run status is '${run.status}', must be 'calculated' to approve` }, { status: 400 });
  }

  await supabaseAdmin.from('pay_runs')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'admin' })
    .eq('id', pay_run_id);

  let depositResults = [];
  if (send_direct_deposit) {
    if (!isDirectDepositConfigured()) {
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

  return NextResponse.json({ ok: true, approved: true, deposits: depositResults });
}
