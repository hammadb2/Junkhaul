// ============================================================
// aiQuality.js
//
// Model-quality command centre metrics.
//
// Tracks:
// - automatic approval rate
// - manual correction / rejection rate
// - underestimation rate
// - range coverage (actual weight inside predicted min/max)
// - provider failures and latency
// - cost per analysis
// - performance by item category and model version
// ============================================================

import { supabaseAdmin } from './supabase.js';

export async function recordAnalysisQuality({
  observationId,
  bookingId,
  modelVersion,
  provider,
  category,
  actualWeightKg,
  predictedMinKg,
  predictedMaxKg,
  predictedLikelyKg,
  corrected = false,
  correctionReason,
  latencyMs,
  costCents,
  client = supabaseAdmin,
}) {
  const insert = {
    observation_id: observationId,
    booking_id: bookingId,
    model_version: modelVersion,
    provider,
    category,
    actual_weight_kg: actualWeightKg,
    predicted_min_kg: predictedMinKg,
    predicted_max_kg: predictedMaxKg,
    predicted_likely_kg: predictedLikelyKg,
    corrected,
    correction_reason: correctionReason,
    latency_ms: latencyMs,
    cost_cents: costCents,
  };
  const { data, error } = await client.from('ai_analysis_quality').insert(insert).select().single();
  if (error) throw error;
  return data;
}

export function inRange(actual, min, max) {
  return actual === null || actual === undefined || (actual >= (min || 0) && actual <= (max || Infinity));
}

export async function generateQualitySnapshot(period = 'daily', referenceDate = new Date(), client = supabaseAdmin) {
  const end = new Date(referenceDate);
  const start = new Date(end);
  if (period === 'daily') start.setDate(start.getDate() - 1);
  else if (period === 'weekly') start.setDate(start.getDate() - 7);
  else if (period === 'monthly') start.setMonth(start.getMonth() - 1);

  const { data: rows } = await client
    .from('ai_analysis_quality')
    .select('*')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  const total = rows?.length || 0;
  if (total === 0) {
    return {
      period,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      total_analyses: 0,
      auto_approved_count: 0,
      manual_correction_count: 0,
      manual_rejection_count: 0,
      underestimation_count: 0,
      range_coverage_percent: 0,
      provider_failure_count: 0,
      avg_latency_ms: null,
      avg_cost_cents: null,
      category_breakdown: {},
    };
  }

  const corrected = rows.filter((r) => r.corrected);
  const withActual = rows.filter((r) => r.actual_weight_kg !== null && r.actual_weight_kg !== undefined);
  const underestimates = withActual.filter((r) => r.predicted_likely_kg < r.actual_weight_kg);
  const inRangeCount = withActual.filter((r) => inRange(r.actual_weight_kg, r.predicted_min_kg, r.predicted_max_kg)).length;

  const avgLatency = rows.reduce((s, r) => s + (r.latency_ms || 0), 0) / total;
  const avgCost = rows.reduce((s, r) => s + (r.cost_cents || 0), 0) / total;

  const categoryBreakdown = {};
  for (const r of rows) {
    const cat = r.category || 'unknown';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, corrected: 0, underestimates: 0, in_range: 0, total_actual: 0 };
    }
    categoryBreakdown[cat].count++;
    if (r.corrected) categoryBreakdown[cat].corrected++;
    if (r.actual_weight_kg !== null) {
      categoryBreakdown[cat].total_actual++;
      if (r.predicted_likely_kg < r.actual_weight_kg) categoryBreakdown[cat].underestimates++;
      if (inRange(r.actual_weight_kg, r.predicted_min_kg, r.predicted_max_kg)) categoryBreakdown[cat].in_range++;
    }
  }

  const snapshot = {
    period,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    total_analyses: total,
    auto_approved_count: total - corrected.length,
    manual_correction_count: corrected.length,
    manual_rejection_count: 0,
    underestimation_count: underestimates.length,
    range_coverage_percent: withActual.length ? Math.round((inRangeCount / withActual.length) * 1000) / 10 : 0,
    provider_failure_count: rows.filter((r) => r.model_version === 'failure').length,
    avg_latency_ms: Math.round(avgLatency),
    avg_cost_cents: Math.round(avgCost * 100) / 100,
    category_breakdown: categoryBreakdown,
  };

  const { data, error } = await client.from('ai_quality_snapshots').insert(snapshot).select().single();
  if (error) throw error;
  return data;
}

export async function getQualitySnapshots(period = 'daily', limit = 30, client = supabaseAdmin) {
  const { data, error } = await client
    .from('ai_quality_snapshots')
    .select('*')
    .eq('period', period)
    .order('period_start', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getReviewQueue({ status = 'review_required', limit = 50, offset = 0, client = supabaseAdmin } = {}) {
  const { data, error } = await client
    .from('item_observations')
    .select('*, bookings(name, address, total_price), item_candidates(*), item_estimates(*, item_dimensions(*)), item_hazards(*), item_review_decisions(*)')
    .eq('status', status)
    .order('observed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export function keyboardShortcuts() {
  return {
    accept: 'a',
    correct: 'c',
    reject: 'r',
    request_photo: 'p',
    next: 'ArrowRight',
    previous: 'ArrowLeft',
    zoom_in: '+',
    zoom_out: '-',
  };
}
