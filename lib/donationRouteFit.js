// ============================================================
// DONATION ROUTE-FIT ENGINE
//
// Decides whether an approved free donation pickup can be inserted
// into an existing crew route without harming paid work. This module
// NEVER mutates route_plans — it only produces a candidate decision.
// Turning a candidate into an actual route change happens through
// donation_route_proposals (lib/donationRouteProposals.js) + manager
// approval, which is the only path that writes a new route_plans row.
//
// Paid work always wins: every hard rule below either downgrades the
// decision or blocks it outright. Nothing here promises a pickup time
// to a customer — that only happens after manager approval.
//
// decideRouteFit() is a PURE function (no I/O) so the hard rules can
// be unit-tested directly with fixtures — evaluateRouteFit() is just
// the Supabase-fetching wrapper around it.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { getNumberConfig } from './config.js';
import { getEffectiveCapacityEstimate } from './donationCapacity.js';

export const ROUTE_FIT_DECISIONS = [
  'fits_current_route',
  'fits_with_modification',
  'fits_another_route',
  'hold_for_future_route',
  'convert_to_paid',
  'reject',
];

export const AVG_SPEED_KMH = 40; // matches lib/routeOptimizer.js / lib/dispatch.js fallback assumption
export const DEFAULT_TRUCK_EQUIPMENT = new Set(['dolly', 'moving_blankets', 'furniture_straps']);
const LOAD_WEIGHTS = { single_item: 150, quarter: 300, half: 500, full: 700 };

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// Best insertion point among "movable" stops (not completed / not in_progress),
// minimizing added haversine distance — same approach as
// lib/routeOptimizer.js#insertStopMidRoute, kept local since that function
// mutates/persists a route plan and this engine must stay read-only.
export function findBestInsertion(stops, pickup) {
  const lockedCount = stops.filter((s) => s.status === 'completed' || s.status === 'in_progress').length;
  let bestIdx = lockedCount;
  let bestAddedKm = Infinity;

  for (let i = lockedCount; i <= stops.length; i++) {
    const prev = i > 0 ? stops[i - 1] : null;
    const next = i < stops.length ? stops[i] : null;
    let added = 0;
    if (prev?.lat && pickup.lat) added += haversineKm(prev.lat, prev.lng, pickup.lat, pickup.lng);
    if (next?.lat && pickup.lat) {
      added += haversineKm(pickup.lat, pickup.lng, next.lat, next.lng);
      if (prev?.lat && next?.lat) added -= haversineKm(prev.lat, prev.lng, next.lat, next.lng);
    }
    if (added < bestAddedKm) {
      bestAddedKm = added;
      bestIdx = i;
    }
  }
  return { index: bestIdx, addedKm: Number.isFinite(bestAddedKm) ? Math.max(0, bestAddedKm) : 0 };
}

// ------------------------------------------------------------
// decideRouteFit — pure hard-rule evaluator, no Supabase/network I/O.
//
// donationRequest: { lat, lng }
// crewAssignment: { id, status }
// routePlan: { id, route_version, stops: [...] } | null
// lockingProposalsCount: number of OTHER pending proposals on this exact route version
// capacity: effective donation_capacity_estimates row
// paidBookings: bookings rows for the route's customer stops
// config: { truckCapacityKg, maxJobsPerTruck, safetyBufferMin, delayToleranceMin, crewShiftMaxMin }
// ------------------------------------------------------------
export function decideRouteFit({ donationRequest, crewAssignment, routePlan, expectedRouteVersion = null, lockingProposalsCount = 0, capacity, paidBookings = [], destinationCandidate = null, config }) {
  if (!donationRequest?.lat || !donationRequest?.lng) return { decision: 'reject', reasons: ['missing_pickup_coordinates'] };
  if (!crewAssignment) return { decision: 'reject', reasons: ['crew_assignment_not_found'] };
  if (crewAssignment.status === 'completed') return { decision: 'reject', reasons: ['crew_assignment_already_completed'] };
  if (!routePlan) return { decision: 'hold_for_future_route', reasons: ['no_route_plan_generated_yet'] };
  if (expectedRouteVersion != null && routePlan.route_version !== expectedRouteVersion) {
    return { decision: 'reject', reasons: ['stale_route_version'], route_version: routePlan.route_version };
  }

  const reasons = [];
  if (lockingProposalsCount > 0) {
    reasons.push('active_manager_lock');
    return { decision: 'fits_another_route', reasons, route_version: routePlan.route_version, crew_assignment_id: crewAssignment.id };
  }

  if (!capacity) return { decision: 'reject', reasons: ['no_capacity_estimate'] };

  const { truckCapacityKg, maxJobsPerTruck, safetyBufferMin, delayToleranceMin, crewShiftMaxMin } = config;
  const stops = Array.isArray(routePlan.stops) ? routePlan.stops : [];
  const customerStopIds = stops.filter((s) => s.type === 'customer').map((s) => s.id);
  const bookingById = new Map(paidBookings.map((b) => [b.id, b]));

  // --- Hard rule: truck capacity ---
  const currentLoadKg = paidBookings
    .filter((b) => ['confirmed', 'scheduled', 'in_progress', 'completed'].includes(b.status))
    .reduce((sum, b) => sum + (b.ai_weight_estimate_kg || LOAD_WEIGHTS[b.load_size] || 0), 0);
  const projectedLoadKg = currentLoadKg + (Number(capacity.weight_kg_max) || 0);
  const capacityViolation = projectedLoadKg > truckCapacityKg;
  if (capacityViolation) reasons.push('truck_capacity_violation');

  // --- Hard rule: max jobs per truck (donation stop counts as a stop) ---
  const jobCountViolation = customerStopIds.length + 1 > maxJobsPerTruck;
  if (jobCountViolation) reasons.push('max_jobs_per_truck_violation');

  // --- Hard rule: destination acceptance / hours ---
  if (destinationCandidate) {
    if (destinationCandidate.considered === false || destinationCandidate.rejection_reason) {
      reasons.push('closed_or_non_accepting_destination');
    }
  } else {
    reasons.push('no_destination_candidate');
  }

  // --- Hard rule: required equipment beyond default truck kit ---
  const missingEquipment = (capacity.required_equipment || []).filter((eq) => !DEFAULT_TRUCK_EQUIPMENT.has(eq));
  if (missingEquipment.length) reasons.push(`missing_equipment:${missingEquipment.join(',')}`);

  // --- Hard rule: unsafe load order (fragile item, understaffed crew) ---
  if (capacity.fragile && Number(capacity.crew_count) < 2) reasons.push('unsafe_load_order_single_crew');

  // --- Best insertion point + added distance/time ---
  const pickup = { lat: donationRequest.lat, lng: donationRequest.lng };
  const { index: bestInsertionIndex, addedKm } = findBestInsertion(stops, pickup);
  const addedDriveMinutes = (addedKm / AVG_SPEED_KMH) * 60;
  const donationServiceMinutes = (Number(capacity.pickup_duration_minutes) || 20) + (Number(capacity.loading_duration_minutes) || 15);
  const addedLabourMinutes = addedDriveMinutes + donationServiceMinutes;

  // --- Hard rule: crew shift length ---
  const existingRouteMinutes = stops.reduce((sum, s) => sum + (s.type === 'customer' ? 45 : 20), 0); // rough per-stop service estimate
  const projectedShiftMinutes = existingRouteMinutes + addedLabourMinutes;
  const shiftViolation = projectedShiftMinutes > crewShiftMaxMin;
  if (shiftViolation) reasons.push('crew_shift_limit_violation');

  // --- Hard rule: paid customer window delay ---
  let maxDelayMinutes = 0;
  let delayedBookingCount = 0;
  stops.slice(bestInsertionIndex).forEach((stop) => {
    if (stop.type !== 'customer') return;
    const booking = bookingById.get(stop.id);
    const windowEndMin = toMinutes(booking?.job_window_end);
    if (windowEndMin == null) return;
    const projectedDelay = Math.max(0, addedLabourMinutes - safetyBufferMin);
    if (projectedDelay > 0) {
      maxDelayMinutes = Math.max(maxDelayMinutes, projectedDelay);
      if (projectedDelay > delayToleranceMin) delayedBookingCount += 1;
    }
  });
  const paidWindowViolation = delayedBookingCount > 0;
  if (paidWindowViolation) reasons.push('paid_job_window_violation');
  const paidJobDelayRisk = paidWindowViolation ? 'high' : maxDelayMinutes > 0 ? (maxDelayMinutes > delayToleranceMin / 2 ? 'medium' : 'low') : 'none';

  const hardBlockers = [capacityViolation, jobCountViolation, shiftViolation, missingEquipment.length > 0].some(Boolean);
  const softBlockers = [paidWindowViolation, reasons.includes('closed_or_non_accepting_destination'), reasons.includes('no_destination_candidate')].some(Boolean);

  let decision;
  if (hardBlockers) {
    decision = 'hold_for_future_route';
  } else if (paidWindowViolation) {
    // Try a later insertion point that doesn't touch the delayed stops.
    const laterInsertion = findBestInsertion(stops.slice(0, bestInsertionIndex), pickup);
    if (laterInsertion.addedKm < Infinity && bestInsertionIndex > 0) {
      decision = 'fits_with_modification';
      reasons.push('resolved_by_alternate_insertion_point');
    } else {
      decision = 'reject';
    }
  } else if (softBlockers) {
    decision = 'reject';
  } else if (reasons.includes('unsafe_load_order_single_crew')) {
    decision = 'fits_with_modification';
  } else {
    decision = 'fits_current_route';
  }

  const alternativesEvaluated = [{
    crew_assignment_id: crewAssignment.id,
    route_version: routePlan.route_version,
    decision,
    added_km: Number(addedKm.toFixed(2)),
    reasons: [...reasons],
  }];

  return {
    decision,
    route_plan_id: routePlan.id,
    route_version: routePlan.route_version,
    crew_assignment_id: crewAssignment.id,
    best_insertion_index: bestInsertionIndex,
    added_km: Number(addedKm.toFixed(2)),
    added_drive_minutes: Number(addedDriveMinutes.toFixed(1)),
    added_labour_minutes: Number(addedLabourMinutes.toFixed(1)),
    capacity_impact: {
      current_load_kg: currentLoadKg,
      projected_load_kg: Number(projectedLoadKg.toFixed(1)),
      truck_capacity_kg: truckCapacityKg,
      job_count_before: customerStopIds.length,
      job_count_after: customerStopIds.length + 1,
      max_jobs_per_truck: maxJobsPerTruck,
    },
    paid_job_delay_risk: paidJobDelayRisk,
    max_delay_minutes: Number(maxDelayMinutes.toFixed(1)),
    confidence: Number(capacity.confidence) || 0.5,
    reasons,
    alternatives_evaluated: alternativesEvaluated,
    destination_candidate: destinationCandidate || null,
  };
}

// ------------------------------------------------------------
// evaluateRouteFit — Supabase-fetching wrapper around decideRouteFit()
// for ONE candidate crew_assignment/route.
// ------------------------------------------------------------
export async function evaluateRouteFit({ donationRequestId, crewAssignmentId, expectedRouteVersion = null, destinationCandidate = null }) {
  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('*').eq('id', donationRequestId).single();
  if (!donationRequest) return { decision: 'reject', reasons: ['donation_request_not_found'] };

  const { data: crewAssignment } = await supabaseAdmin.from('crew_assignments').select('*').eq('id', crewAssignmentId).single();

  const { data: routePlan } = await supabaseAdmin
    .from('route_plans')
    .select('*')
    .eq('crew_assignment_id', crewAssignmentId)
    .order('route_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let lockingProposalsCount = 0;
  if (routePlan) {
    const { data: lockingProposals } = await supabaseAdmin
      .from('donation_route_proposals')
      .select('id')
      .eq('crew_assignment_id', crewAssignmentId)
      .eq('source_route_version', routePlan.route_version)
      .eq('status', 'pending')
      .neq('donation_request_id', donationRequestId);
    lockingProposalsCount = lockingProposals?.length || 0;
  }

  const capacity = await getEffectiveCapacityEstimate(donationRequestId);

  const [truckCapacityKg, maxJobsPerTruck, safetyBufferMin, delayToleranceMin, crewShiftMaxMin] = await Promise.all([
    getNumberConfig('dispatch_truck_capacity_kg', 700),
    getNumberConfig('dispatch_max_jobs_per_truck', 6),
    getNumberConfig('donation_route_fit_safety_buffer_minutes', 15),
    getNumberConfig('donation_paid_job_delay_tolerance_minutes', 10),
    getNumberConfig('crew_shift_max_minutes', 600),
  ]);

  const stops = Array.isArray(routePlan?.stops) ? routePlan.stops : [];
  const customerStopIds = stops.filter((s) => s.type === 'customer').map((s) => s.id);
  const { data: paidBookings } = customerStopIds.length
    ? await supabaseAdmin.from('bookings').select('id, job_window_start, job_window_end, ai_weight_estimate_kg, load_size, status').in('id', customerStopIds)
    : { data: [] };

  return decideRouteFit({
    donationRequest,
    crewAssignment,
    routePlan,
    expectedRouteVersion,
    lockingProposalsCount,
    capacity,
    paidBookings: paidBookings || [],
    destinationCandidate,
    config: { truckCapacityKg, maxJobsPerTruck, safetyBufferMin, delayToleranceMin, crewShiftMaxMin },
  });
}

// ------------------------------------------------------------
// findBestRouteFit — evaluates multiple candidate crew_assignments
// (e.g. every truck operating for the donation's quadrant/date) and
// returns the best-fitting one, with every alternative recorded.
// ------------------------------------------------------------
export async function findBestRouteFit({ donationRequestId, candidateCrewAssignmentIds, destinationCandidate = null }) {
  if (!candidateCrewAssignmentIds?.length) {
    return { decision: 'hold_for_future_route', reasons: ['no_candidate_routes_available'], alternatives_evaluated: [] };
  }

  const decisionRank = { fits_current_route: 0, fits_with_modification: 1, fits_another_route: 2, hold_for_future_route: 3, convert_to_paid: 4, reject: 5 };
  let best = null;
  const allAlternatives = [];

  for (const crewAssignmentId of candidateCrewAssignmentIds) {
    const result = await evaluateRouteFit({ donationRequestId, crewAssignmentId, destinationCandidate });
    allAlternatives.push(...(result.alternatives_evaluated || [{ crew_assignment_id: crewAssignmentId, decision: result.decision, reasons: result.reasons }]));
    if (!best || decisionRank[result.decision] < decisionRank[best.decision]) {
      best = result;
    }
  }

  if (best.decision !== 'fits_current_route' && candidateCrewAssignmentIds.length > 1) {
    // A non-ideal best result across multiple routes reads as "try another route".
    const anyFits = allAlternatives.some((a) => a.decision === 'fits_current_route' || a.decision === 'fits_with_modification');
    if (anyFits && best.decision === 'hold_for_future_route') best.decision = 'fits_another_route';
  }

  return { ...best, alternatives_evaluated: allAlternatives };
}

// ------------------------------------------------------------
// saveRouteFitResult — persists an evaluation as the current
// donation_route_matches "candidate" row for this donation request.
// Route-fit results are always advisory until a manager approves a
// donation_route_proposal (lib/donationRouteProposals.js).
// ------------------------------------------------------------
export async function saveRouteFitResult({ donationRequestId, result, modelVersion = 'donation-route-fit-v1', createdBy = null }) {
  const { data: row, error } = await supabaseAdmin
    .from('donation_route_matches')
    .insert({
      donation_request_id: donationRequestId,
      crew_assignment_id: result.crew_assignment_id || null,
      route_plan_id: result.route_plan_id || null,
      route_version: result.route_version ?? null,
      status: 'candidate',
      decision: ROUTE_FIT_DECISIONS.includes(result.decision) ? result.decision : 'reject',
      best_insertion_index: result.best_insertion_index ?? null,
      detour_km: result.added_km ?? null,
      added_km: result.added_km ?? null,
      added_driving_minutes: result.added_drive_minutes != null ? Math.round(result.added_drive_minutes) : null,
      added_labour_minutes: result.added_labour_minutes ?? null,
      added_service_minutes: result.added_labour_minutes != null ? Math.round(result.added_labour_minutes) : null,
      paid_customer_delay_minutes: result.max_delay_minutes != null ? Math.round(result.max_delay_minutes) : null,
      paid_job_delay_risk: result.paid_job_delay_risk || 'none',
      capacity_impact: result.capacity_impact || {},
      confidence: result.confidence ?? null,
      reasons: result.reasons || [],
      alternatives_evaluated: result.alternatives_evaluated || [],
      route_fit_result: result,
      destination_score_id: result.destination_candidate?.id || null,
      model_version: modelVersion,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}
