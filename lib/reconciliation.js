// ============================================================
// reconciliation.js
//
// Daily reconciliation, payroll feed, and actual profitability.
// - Reconcile GPS/odometer km, rental invoice, fuel, employee clock,
//   disposal tickets, payment fees and supplies against the estimate.
// - Manager sign-off locks the route and creates adjusting entries.
// - Approved hours are fed into payroll without rewriting history.
// - Margin reporting by route, job, vehicle, estimator, segment, waste stream.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { calculateRouteCost, persistCostLedger } from './costLedger.js';
const VARIANCE_THRESHOLD_CENTS = 500; // $5

export function varianceCents(estimated, actual) {
  return actual - estimated;
}

export async function getRoutePlanWithRun(routePlanId, client = supabaseAdmin) {
  const { data: routePlan } = await client.from('route_plans').select('*, crew_assignments(*)').eq('id', routePlanId).maybeSingle();
  if (!routePlan) throw new Error('Route plan not found');
  const { data: routeRun } = await client.from('route_runs').select('*').eq('route_plan_id', routePlanId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return { routePlan, routeRun };
}

export async function buildEstimatedCostForRoutePlan(routePlan, client = supabaseAdmin) {
  const customerStops = (routePlan.stops || []).filter((s) => s.type === 'customer' || s.purpose === 'customer');
  const bookingIds = customerStops.map((s) => s.booking_id).filter(Boolean);
  if (!bookingIds.length) return null;
  const { data: bookings } = await client.from('bookings').select('*').in('id', bookingIds);
  const revenueCents = (bookings || []).reduce((s, b) => s + (b.total_price_cents || 0), 0);
  return calculateRouteCost({
    routeType: routePlan.route_type || 'junkhaul_dirty',
    bookings: bookings || [],
    distanceKm: routePlan.total_distance_km || 0,
    durationMinutes: routePlan.total_duration_min || 0,
    revenueCents,
    client,
  });
}

export async function buildActualCost({
  estimatedCost,
  actualDistanceKm,
  actualDurationMinutes,
  fuelLitres,
  fuelCostCents,
  disposalActualCents,
  rentalInvoiceCents,
  laborCostCents,
  paymentFeeCents,
  suppliesCents,
  otherCents,
}) {
  const actualBreakdown = JSON.parse(JSON.stringify(estimatedCost.breakdown));

  // Override with actuals where supplied.
  if (typeof rentalInvoiceCents === 'number') {
    actualBreakdown.rental.total_cents = rentalInvoiceCents;
  }
  if (typeof fuelCostCents === 'number') {
    actualBreakdown.fuel.total_cents = fuelCostCents;
    if (fuelLitres) actualBreakdown.fuel.litres = fuelLitres;
  }
  if (typeof laborCostCents === 'number') {
    actualBreakdown.labor.total_cents = laborCostCents;
  }
  if (typeof disposalActualCents === 'number') {
    actualBreakdown.disposal.total_cents = disposalActualCents;
  }
  if (typeof paymentFeeCents === 'number') {
    actualBreakdown.overhead.payment_fee_cents = paymentFeeCents;
  }
  if (typeof suppliesCents === 'number') {
    actualBreakdown.overhead.supplies_cents = suppliesCents;
  }
  if (typeof actualDistanceKm === 'number') {
    actualBreakdown.rental.mileage_km = actualDistanceKm;
  }
  if (typeof actualDurationMinutes === 'number' && estimatedCost.assumptions) {
    actualBreakdown.labor.hours = actualDurationMinutes / 60;
  }
  if (typeof otherCents === 'number') {
    actualBreakdown.overhead.other_cents = otherCents;
  }

  // Recompute totals.
  const totalCostCents =
    actualBreakdown.rental.total_cents +
    actualBreakdown.fuel.total_cents +
    actualBreakdown.labor.total_cents +
    actualBreakdown.disposal.total_cents +
    Object.values(actualBreakdown.overhead).reduce((s, v) => (typeof v === 'number' ? s + v : s), 0);

  actualBreakdown.total_cost_cents = totalCostCents;

  return {
    ...estimatedCost,
    breakdown: actualBreakdown,
    assumptions: {
      ...estimatedCost.assumptions,
      total_km: actualDistanceKm ?? estimatedCost.assumptions.total_km,
      total_minutes: actualDurationMinutes ?? estimatedCost.assumptions.total_minutes,
    },
  };
}

export async function reconcileRoute({
  routePlanId,
  actuals = {},
  managerId,
  notes = '',
  client = supabaseAdmin,
}) {
  const { routePlan, routeRun } = await getRoutePlanWithRun(routePlanId, client);

  // Find or create a route run to attach ledger entries.
  let run = routeRun;
  if (!run) {
    const { createRouteRun } = await import('./costLedger.js');
    run = await createRouteRun({
      routePlanId,
      crewAssignmentId: routePlan.crew_assignment_id,
      routeType: routePlan.route_type || 'junkhaul_dirty',
      plannedDistanceKm: routePlan.total_distance_km || 0,
      plannedDurationMinutes: routePlan.total_duration_min || 0,
      client,
    });
  }

  const estimatedCost = await buildEstimatedCostForRoutePlan(routePlan, client);
  if (!estimatedCost) throw new Error('No customer bookings on route plan');

  // Persist estimated ledger if not yet present.
  const { data: existingEstimated } = await client.from('cost_ledger_entries')
    .select('id').eq('route_run_id', run.id).eq('phase', 'estimated').limit(1);
  if (!existingEstimated || existingEstimated.length === 0) {
    await persistCostLedger({ routeRunId: run.id, costResult: estimatedCost, phase: 'estimated', client });
  }

  const actualCost = await buildActualCost({ estimatedCost, ...actuals });

  // Persist actual ledger.
  await persistCostLedger({ routeRunId: run.id, costResult: actualCost, phase: 'actual', client });

  // Update route run actuals.
  await client.from('route_runs').update({
    actual_distance_km: actualCost.assumptions.total_km,
    actual_duration_minutes: actualCost.assumptions.total_minutes,
    status: 'completed',
    actual_end_at: new Date().toISOString(),
  }).eq('id', run.id);

  const estimatedRevenue = estimatedCost.breakdown.proposed_price_cents;
  const estimatedCostTotal = estimatedCost.breakdown.total_cost_cents;
  const actualRevenue = estimatedRevenue; // revenue generally unchanged unless adjusted
  const actualCostTotal = actualCost.breakdown.total_cost_cents;
  const variance = actualCostTotal - estimatedCostTotal;

  const { data: reconciliation } = await client.from('daily_reconciliations').insert({
    route_plan_id: routePlanId,
    route_run_id: run.id,
    reconciliation_date: routePlan.assignment_date || new Date().toISOString().slice(0, 10),
    status: 'open',
    estimated_revenue_cents: estimatedRevenue,
    estimated_cost_cents: estimatedCostTotal,
    estimated_contribution_cents: estimatedRevenue - estimatedCostTotal,
    actual_revenue_cents: actualRevenue,
    actual_cost_cents: actualCostTotal,
    actual_contribution_cents: actualRevenue - actualCostTotal,
    variance_cents: variance,
    notes,
  }).select().single();
  if (!reconciliation) throw new Error('Failed to create reconciliation');

  // Variance lines.
  const varianceRows = [];
  const estimated = estimatedCost.breakdown;
  const actual = actualCost.breakdown;

  const push = (category, est, act, reason = '') => {
    const v = varianceCents(est, act);
    const flagged = Math.abs(v) > VARIANCE_THRESHOLD_CENTS;
    varianceRows.push({
      daily_reconciliation_id: reconciliation.id,
      category,
      estimated_cents: est,
      actual_cents: act,
      variance_cents: v,
      threshold_cents: VARIANCE_THRESHOLD_CENTS,
      flagged,
      reason: flagged ? reason : '',
    });
  };

  push('rental', estimated.rental.total_cents, actual.rental.total_cents, 'Rental invoice differs from estimate');
  push('fuel', estimated.fuel.total_cents, actual.fuel.total_cents, 'Fuel receipt differs from estimate');
  push('labor', estimated.labor.total_cents, actual.labor.total_cents, 'Clocked hours differ from estimate');
  push('disposal', estimated.disposal.total_cents, actual.disposal.total_cents, 'Disposal ticket differs from estimate');
  push('overhead', estimated.overhead.total_cents, actual.overhead.total_cents, 'Overhead differs from estimate');

  // Missing evidence flags.
  if (actuals.actualDistanceKm == null) {
    varianceRows.push({ daily_reconciliation_id: reconciliation.id, category: 'odometer', estimated_cents: 0, actual_cents: 0, variance_cents: 0, threshold_cents: 0, flagged: true, reason: 'Missing odometer/GPS distance' });
  }
  if (actuals.fuelLitres == null || actuals.fuelCostCents == null) {
    varianceRows.push({ daily_reconciliation_id: reconciliation.id, category: 'fuel_receipt', estimated_cents: 0, actual_cents: 0, variance_cents: 0, threshold_cents: 0, flagged: true, reason: 'Missing fuel receipt' });
  }
  if (actuals.disposalActualCents == null) {
    varianceRows.push({ daily_reconciliation_id: reconciliation.id, category: 'disposal_ticket', estimated_cents: 0, actual_cents: 0, variance_cents: 0, threshold_cents: 0, flagged: true, reason: 'Missing disposal ticket' });
  }

  if (varianceRows.length) {
    const { error } = await client.from('reconciliation_variances').insert(varianceRows);
    if (error) throw error;
  }

  return { reconciliation, variances: varianceRows, estimatedCost, actualCost, routeRun: run };
}

export async function signOffReconciliation({ reconciliationId, managerId, adjustments = [], notes = '', client = supabaseAdmin }) {
  const { data: reconciliation } = await client.from('daily_reconciliations').select('*').eq('id', reconciliationId).single();
  if (!reconciliation) throw new Error('Reconciliation not found');
  if (reconciliation.status === 'signed_off') throw new Error('Reconciliation already signed off');

  // Create adjusting entries for any manager-approved corrections.
  const adjustingRows = adjustments.map((a) => ({
    daily_reconciliation_id: reconciliationId,
    original_ledger_entry_id: a.original_ledger_entry_id || null,
    category: a.category,
    old_amount_cents: a.old_amount_cents,
    new_amount_cents: a.new_amount_cents,
    difference_cents: a.new_amount_cents - a.old_amount_cents,
    reason: a.reason,
    manager_id: managerId,
  }));
  if (adjustingRows.length) {
    const { error } = await client.from('adjusting_entries').insert(adjustingRows);
    if (error) throw error;
  }

  const { data, error } = await client.from('daily_reconciliations').update({
    status: 'signed_off',
    manager_id: managerId,
    signed_off_at: new Date().toISOString(),
    notes: [reconciliation.notes || '', notes].filter(Boolean).join('\n'),
  }).eq('id', reconciliationId).select().single();
  if (error) throw error;
  return { reconciliation: data, adjustments: adjustingRows };
}

export async function feedApprovedHoursToPayroll({
  reconciliationId,
  timesheetApprovals = [],
  managerId,
  payRunId,
  client = supabaseAdmin,
}) {
  const { data: reconciliation } = await client.from('daily_reconciliations').select('*').eq('id', reconciliationId).single();
  if (!reconciliation) throw new Error('Reconciliation not found');
  if (reconciliation.status !== 'signed_off') throw new Error('Reconciliation must be signed off before payroll feed');

  const rows = [];
  for (const ta of timesheetApprovals) {
    // Prevent duplicate locked payroll feeds for the same timesheet.
    const { data: existing } = await client.from('route_reconciliation_payroll')
      .select('id, locked')
      .eq('timesheet_id', ta.timesheet_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.locked) throw new Error(`Timesheet ${ta.timesheet_id} is already locked in payroll`);

    rows.push({
      daily_reconciliation_id: reconciliationId,
      timesheet_id: ta.timesheet_id,
      pay_run_id: payRunId,
      approved_regular_hours: ta.regular_hours,
      approved_overtime_hours: ta.overtime_hours,
      locked: true,
      locked_at: new Date().toISOString(),
      created_by: managerId,
    });

    // Mark timesheet approved and link to pay run.
    await client.from('timesheets').update({
      pay_run_id: payRunId || null,
      approved_regular_hours: ta.regular_hours,
      approved_overtime_hours: ta.overtime_hours,
      approved_by: managerId,
      approved_at: new Date().toISOString(),
    }).eq('id', ta.timesheet_id);
  }

  if (rows.length) {
    const { data, error } = await client.from('route_reconciliation_payroll').insert(rows).select();
    if (error) throw error;
    return data;
  }
  return [];
}

export async function getMarginReport({ startDate, endDate, groupBy = 'route_plan_id', client = supabaseAdmin }) {
  const allowedGroups = ['route_plan_id', 'booking_id', 'vehicle_profile_id', 'estimator_id', 'customer_segment', 'waste_stream'];
  if (!allowedGroups.includes(groupBy)) throw new Error('Invalid groupBy');

  const { data: snapshots, error } = await client.from('profitability_snapshots')
    .select('*, bookings(customer_segment, waste_stream), route_runs(vehicle_profile_id, route_plan_id)')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);
  if (error) throw error;

  const groups = {};
  for (const s of snapshots || []) {
    let key = s[groupBy];
    if (groupBy === 'vehicle_profile_id') key = s.route_runs?.vehicle_profile_id;
    if (groupBy === 'route_plan_id') key = s.route_runs?.route_plan_id;
    if (groupBy === 'customer_segment') key = s.bookings?.customer_segment || 'unknown';
    if (groupBy === 'waste_stream') key = s.bookings?.waste_stream || 'unknown';
    if (!key) key = 'unknown';
    if (!groups[key]) groups[key] = { revenue_cents: 0, cost_cents: 0, contribution_cents: 0, count: 0 };
    groups[key].revenue_cents += s.revenue_cents || 0;
    groups[key].cost_cents += s.direct_cost_cents || 0;
    groups[key].contribution_cents += s.contribution_cents || 0;
    groups[key].count += 1;
  }

  return Object.entries(groups).map(([key, agg]) => ({
    group_by: groupBy,
    key,
    revenue_cents: agg.revenue_cents,
    cost_cents: agg.cost_cents,
    contribution_cents: agg.contribution_cents,
    margin_percent: agg.revenue_cents ? (agg.contribution_cents / agg.revenue_cents) * 100 : 0,
    count: agg.count,
  }));
}
