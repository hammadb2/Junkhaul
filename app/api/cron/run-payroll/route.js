import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { alertOperator } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/run-payroll
//
// Intended to run every other Friday (payday for biweekly). It's
// actually invoked every Friday (both pg_cron and vercel.json
// schedule it weekly -- the pg_cron duplicate is removed by
// 20260903000001_remove_duplicate_payroll_cron.sql, Vercel's is
// what remains) plus whenever anyone hits it manually. Rather than
// rely on getting the cron cadence itself exactly right, the period
// math below computes each period SEQUENTIALLY from the last pay
// run's period_end instead of "the trailing 14 days ending today"
// (audit E3): the old version recomputed a fresh trailing-14-day
// window relative to *today* on every invocation, so a weekly
// firing produced a new overlapping 14-day period every week
// instead of two clean back-to-back fortnights. Computing the next
// period from the last one makes this idempotent and correctly
// biweekly regardless of how often the endpoint is actually called
// -- calling it early just no-ops until the computed period has
// elapsed.
//
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

  // Determine the next pay period sequentially from the last one that was
  // ever created, so periods never overlap regardless of firing cadence.
  const { data: lastRun } = await supabaseAdmin
    .from('pay_runs')
    .select('period_end')
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  let periodStart, periodEnd;
  if (lastRun?.period_end) {
    const nextStart = new Date(`${lastRun.period_end}T00:00:00Z`);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    periodStart = nextStart.toISOString().slice(0, 10);
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 13);
    periodEnd = nextEnd.toISOString().slice(0, 10);
  } else {
    // Bootstrap: no pay runs exist yet, so there's no prior period to
    // continue from -- use the trailing 14 days ending today.
    const today = new Date();
    periodEnd = today.toISOString().slice(0, 10);
    periodStart = new Date(today.getTime() - 13 * 86400000).toISOString().slice(0, 10);
  }

  // The next period hasn't finished yet -- nothing to do until it has.
  const todayStr = new Date().toISOString().slice(0, 10);
  if (periodEnd > todayStr) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: `Next pay period (${periodStart} to ${periodEnd}) hasn't ended yet`,
    });
  }

  // Belt-and-suspenders: guard against an exact-duplicate invocation
  // (e.g. a race between two schedulers firing the same day) even though
  // the sequential computation above shouldn't produce one by construction.
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
