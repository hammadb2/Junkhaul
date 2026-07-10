import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { alertOperator } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/run-payroll
//
// Runs automatically every other Friday (payday for biweekly).
// Checks if there are un-paid shifts in the current pay period.
// If yes, creates a pay run in 'calculated' status and alerts the
// operator to review + approve it in the admin dashboard.
//
// We do NOT auto-approve or auto-send direct deposits — a human
// must review and click "Approve" before money moves. This is the
// one place where a payroll mistake costs real money.
// ============================================================

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine the pay period: the two weeks ending today
  const today = new Date();
  const periodEnd = today.toISOString().slice(0, 10);
  const periodStart = new Date(today.getTime() - 13 * 86400000).toISOString().slice(0, 10);

  // Check if there's already a pay run for this period
  const { data: existing } = await supabaseAdmin
    .from('pay_runs')
    .select('id, status')
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, message: 'Pay run already exists for this period' });
  }

  // Check if there are un-paid shifts
  const { data: shifts, count } = await supabaseAdmin
    .from('timesheets')
    .select('id', { count: 'exact', head: true })
    .is('pay_run_id', null)
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', periodStart)
    .lte('clock_in_at', periodEnd + 'T23:59:59');

  if (!count || count === 0) {
    return NextResponse.json({ ok: true, skipped: true, message: 'No shifts to pay this period' });
  }

  // Trigger the pay run via the internal API (same logic as the admin button)
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteUrl = (rawUrl && rawUrl.startsWith('https://')) ? rawUrl.replace(/\/$/, '') : 'https://junkhaul.ca';
  const res = await fetch(`${siteUrl}/api/admin/payroll/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET,
    },
    body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
  });
  const data = await res.json();

  if (!res.ok) {
    await alertOperator(`Payroll auto-run FAILED for ${periodStart} to ${periodEnd}: ${data.error}. Check /admin/crew.`);
    return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
  }

  const stubCount = data.pay_run?.stubs?.length || 0;
  const craTotal = Number(data.pay_run?.totals?.total_cra_remittance || 0).toFixed(2);
  const netTotal = Number(data.pay_run?.totals?.total_net || 0).toFixed(2);

  await alertOperator(`Payroll calculated for ${periodStart} to ${periodEnd}. ${stubCount} stubs, $${netTotal} net, $${craTotal} owed to CRA. Review and approve at /admin/crew to send direct deposits.`);

  return NextResponse.json({
    ok: true,
    pay_run_id: data.pay_run_id,
    stubs: stubCount,
    net: netTotal,
    cra_remittance: craTotal,
  });
}
