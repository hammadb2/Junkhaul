import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkCronSecret } from '@/lib/cronAuth';
import { dayType } from '@/lib/dates';
import { daysUntilJob, daysOutBucket } from '@/lib/surge';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed } from '@/lib/audit';

export const runtime = 'nodejs';

// ============================================================
// DEMAND SNAPSHOT CRON — runs every 6 hours.
//
// Logs the current fill ratio of every open future slot into
// slot_demand_snapshots. Over a few weeks this builds the
// historical baseline that lib/surge.js needs to tell "normal"
// pace apart from a real demand spike, instead of guessing off
// absolute fill percentages forever.
//
// This is pure data collection — it never sends a message or
// changes a price. Safe to run as often as needed.
// ============================================================

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'demand-snapshot';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn('demand_snapshot'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: slots } = await supabaseAdmin
      .from('schedule')
      .select('slot_date, slot_time, jobs_booked, max_jobs')
      .gte('slot_date', today)
      .eq('is_available', true);

    if (!slots || slots.length === 0) {
      await cronFinished(cronName, { logged: 0 });
      return NextResponse.json({ ok: true, logged: 0 });
    }

    const rows = slots
      .filter((s) => s.max_jobs > 0)
      .map((s) => {
        const daysOut = daysUntilJob(s.slot_date);
        return {
          slot_date: s.slot_date,
          slot_time: s.slot_time,
          day_type: dayType(s.slot_date),
          jobs_booked: s.jobs_booked,
          max_jobs: s.max_jobs,
          fill_ratio: s.jobs_booked / s.max_jobs,
          days_out: daysOut,
          days_out_bucket: daysOutBucket(daysOut),
          snapshot_at: new Date().toISOString(),
        };
      });

    const { error } = await supabaseAdmin.from('slot_demand_snapshots').insert(rows);

    if (error) {
      console.error('demand-snapshot insert failed:', error);
      await cronFailed(cronName, error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await cronFinished(cronName, { logged: rows.length });
    return NextResponse.json({ ok: true, logged: rows.length });
  } catch (error) {
    await cronFailed('demand-snapshot', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
