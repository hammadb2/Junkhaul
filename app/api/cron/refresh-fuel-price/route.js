import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkCronSecret } from '@/lib/cronAuth';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed } from '@/lib/audit';
import { fetchLiveFuelPrice } from '@/lib/fuelPrice';

export const runtime = 'nodejs';

// ============================================================
// REFRESH FUEL PRICE CRON
//
// Pulls the current Calgary Regular 87 price (see lib/fuelPrice.js —
// Natural Resources Canada's daily city survey, free/no key) and
// writes a new fuel_rate_versions row so every quote after this point
// uses it. Runs on a schedule rather than per-quote so a slow/flaky
// fetch never sits on a customer's checkout critical path.
//
// If the live fetch fails or returns nothing usable, this run is a
// no-op — the existing active fuel_rate_versions row (a hand-entered,
// intentionally conservative fallback) stays in effect. A quote's fuel
// cost is NEVER zero because this cron happened to fail; it just keeps
// using the last good price until the next successful run.
// ============================================================

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'refresh-fuel-price';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn('refresh_fuel_price'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const live = await fetchLiveFuelPrice();
    if (!live) {
      await cronFinished(cronName, { skipped: true, reason: 'live_fetch_failed_keeping_fallback' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'live_fetch_failed_keeping_fallback' });
    }

    // Carry forward the current safety-buffer setting rather than
    // resetting it — this cron updates the PRICE, not the buffer policy.
    const { data: current } = await supabaseAdmin
      .from('fuel_rate_versions')
      .select('fuel_safety_buffer_percent, quote_safety_l_per_100km')
      .eq('status', 'active')
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from('fuel_rate_versions')
      .insert({
        effective_from: new Date().toISOString(),
        price_per_litre: live.price_per_litre,
        source: live.source,
        fetched_at: live.fetched_at,
        is_live_fetch: true,
        fuel_safety_buffer_percent: current?.fuel_safety_buffer_percent ?? 10,
        quote_safety_l_per_100km: current?.quote_safety_l_per_100km ?? 45,
      })
      .select()
      .single();

    if (error) throw error;

    await cronFinished(cronName, { price_per_litre: live.price_per_litre, version_id: data.id });
    return NextResponse.json({ ok: true, price_per_litre: live.price_per_litre, version_id: data.id });
  } catch (error) {
    await cronFailed('refresh-fuel-price', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
