// ============================================================
// SURGE PRICING ENGINE — real demand-based multiplier.
//
// Unlike the static -5% early-bird rule in lib/pricing.js, this
// looks at how fast a slot is actually filling right now versus
// how it has historically filled at the same point (day type +
// slot time + days-until-job), and raises or lowers price to
// match real demand — the same principle as ride-hailing surge,
// scaled down to a single-truck operation.
//
// Bootstraps safely: until slot_demand_snapshots has enough
// history for a given (day_type, slot_time, days_out_bucket)
// combination, it falls back to a conservative fill-ratio-only
// rule so pricing is never wrong for lack of data.
//
// Pricing stays invisible to the customer — single clean price,
// same philosophy as the rest of lib/pricing.js.
//
// CONFIGURATION: all constants are read from system_config with
// hardcoded fallback defaults.
// ============================================================

import { supabaseAdmin } from './supabase';
import { getBooleanConfig, getNumberConfig } from './config';

// Fallback defaults
const DEFAULTS = {
  MIN_SURGE_MULTIPLIER: 0.85,
  MAX_SURGE_MULTIPLIER: 1.30,
  MIN_SNAPSHOTS_FOR_BASELINE: 8,
  PACE_COEFFICIENT: 0.6,
  BOOTSTRAP_FILL_90: 1.20,
  BOOTSTRAP_FILL_75_3D: 1.12,
  BOOTSTRAP_FILL_25_2D: 0.92,
};

const loadSurgeConfig = async () => {
  return {
    min: await getNumberConfig('surge_min_multiplier', DEFAULTS.MIN_SURGE_MULTIPLIER),
    max: await getNumberConfig('surge_max_multiplier', DEFAULTS.MAX_SURGE_MULTIPLIER),
    minSnapshots: await getNumberConfig('surge_min_snapshots_for_baseline', DEFAULTS.MIN_SNAPSHOTS_FOR_BASELINE),
    paceCoefficient: await getNumberConfig('surge_pace_coefficient', DEFAULTS.PACE_COEFFICIENT),
    bootstrap90: await getNumberConfig('surge_bootstrap_fill_90', DEFAULTS.BOOTSTRAP_FILL_90),
    bootstrap75_3d: await getNumberConfig('surge_bootstrap_fill_75_3d', DEFAULTS.BOOTSTRAP_FILL_75_3D),
    bootstrap25_2d: await getNumberConfig('surge_bootstrap_fill_25_2d', DEFAULTS.BOOTSTRAP_FILL_25_2D),
    enabled: await getBooleanConfig('kill_switch_surge_pricing', true),
  };
};

// Bucket "days until job" into coarse groups — a booking made
// 6 days out behaves differently from one made 13 days out, but
// we don't need day-level granularity to get a useful baseline.
export const daysOutBucket = (daysOut) => {
  if (daysOut <= 1) return '0-1';
  if (daysOut <= 3) return '2-3';
  if (daysOut <= 7) return '4-7';
  return '8+';
};

export const daysUntilJob = (job_date) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr + 'T00:00:00Z');
  const job = new Date(job_date + 'T00:00:00Z');
  return Math.max(0, Math.round((job - today) / 86400000));
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// ============================================================
// computeSurgeMultiplier — the main entry point.
// Call this from create-booking (and anywhere else that quotes
// a price) BEFORE calculatePrice, then pass the result in as
// `surge_multiplier`.
// ============================================================
export const computeSurgeMultiplier = async ({ job_date, job_time, day_type }) => {
  const cfg = await loadSurgeConfig();

  // Kill switch: surge disabled → return neutral multiplier
  if (!cfg.enabled) {
    return { multiplier: 1.0, mode: 'disabled', fill_ratio: null };
  }

  const { data: slot } = await supabaseAdmin
    .from('schedule')
    .select('jobs_booked, max_jobs')
    .eq('slot_date', job_date)
    .eq('slot_time', job_time)
    .maybeSingle();

  if (!slot || !slot.max_jobs) {
    return { multiplier: 1.0, mode: 'no_slot_data', fill_ratio: null };
  }

  const fillRatio = slot.jobs_booked / slot.max_jobs;
  const daysOut = daysUntilJob(job_date);
  const bucket = daysOutBucket(daysOut);

  const { data: history } = await supabaseAdmin
    .from('slot_demand_snapshots')
    .select('fill_ratio')
    .eq('day_type', day_type)
    .eq('slot_time', job_time)
    .eq('days_out_bucket', bucket)
    .limit(200);

  // ── Learned mode: enough history to know what "normal" looks like ──
  if (history && history.length >= cfg.minSnapshots) {
    const avgHistorical =
      history.reduce((s, h) => s + h.fill_ratio, 0) / history.length;

    // How far ahead of (or behind) normal pace is this slot?
    // +0.30 means "30 percentage points fuller than usual at this
    // days-out checkpoint" — strong demand signal, surge up.
    const paceDelta = fillRatio - avgHistorical;

    const multiplier = clamp(1 + paceDelta * cfg.paceCoefficient, cfg.min, cfg.max);

    return {
      multiplier: Math.round(multiplier * 100) / 100,
      mode: 'learned',
      fill_ratio: fillRatio,
      historical_avg: Math.round(avgHistorical * 100) / 100,
      days_out_bucket: bucket,
      sample_size: history.length,
    };
  }

  // ── Bootstrap mode: no history yet, use conservative absolute rules ──
  let multiplier = 1.0;
  if (fillRatio >= 0.9) {
    multiplier = cfg.bootstrap90;
  } else if (fillRatio >= 0.75 && daysOut <= 3) {
    multiplier = cfg.bootstrap75_3d;
  } else if (fillRatio <= 0.25 && daysOut <= 2) {
    multiplier = cfg.bootstrap25_2d;
  }

  return {
    multiplier,
    mode: 'bootstrap',
    fill_ratio: fillRatio,
    days_out_bucket: bucket,
    sample_size: (history || []).length,
  };
};
