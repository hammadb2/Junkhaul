import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { ensureDailyAssignment } from '@/lib/dispatch';
import { edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/seed-daily-assignments
//
// Runs daily at 6 AM Calgary time. Ensures there's at least one
// crew_assignment row for today and tomorrow so resolveDispatch
// always has a baseline truck to check capacity against.
//
// This replaces the old generate-slots Supabase Edge Function
// which only created schedule table rows for Thu/Sun. With the
// 24-hour any-day guarantee, we need baseline assignments every
// day.
// ============================================================
export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date: todayStr } = edmontonNowParts();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const results = [];
  for (const dateStr of [todayStr, tomorrowStr]) {
    try {
      const result = await ensureDailyAssignment(dateStr);
      results.push({ date: dateStr, ...result });
    } catch (e) {
      results.push({ date: dateStr, action: 'error', error: e.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
