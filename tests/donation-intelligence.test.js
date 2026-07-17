import assert from 'node:assert/strict';
import { parseJson, normalizeItem, deriveOutcome } from '../lib/donationVision.js';
import { evaluatePhotoSufficiency, MISSING_EVIDENCE_REASONS } from '../lib/donationPhotoSufficiency.js';
import { deriveCapacityEstimate } from '../lib/donationCapacity.js';
import { decideRouteFit, findBestInsertion, haversineKm, toMinutes } from '../lib/donationRouteFit.js';
import { scoreDonationCenterCandidate, scoreStorageCandidate, scoreLandfillCandidate } from '../lib/donationDestinations.js';
import { OWNER_ONLY_PERMISSIONS } from '../lib/permissionRules.js';

// ============================================================
// VISION ANALYSIS
// ============================================================

// Valid structured response
{
  const parsed = parseJson('```json\n{"items":[{"category":"furniture"}]}\n```');
  assert.deepEqual(parsed, { items: [{ category: 'furniture' }] });
}

// Invalid / partial provider response — parseJson still extracts the JSON object from prose
{
  const parsed = parseJson('Sure, here you go: {"items": []} — let me know if you need more.');
  assert.deepEqual(parsed, { items: [] });
}
assert.throws(() => parseJson(''), /Empty AI response/);
assert.throws(() => parseJson('not json at all'), /Unexpected token|is not valid JSON/);

// normalizeItem defaults missing/invalid fields instead of crashing on a partial response
{
  const item = normalizeItem({ category: 'furniture', donation_suitability: 'bogus_value', confidence: 5 });
  assert.equal(item.donation_suitability, 'needs_manual_review'); // invalid enum -> safe default
  assert.equal(item.confidence, 1); // clamped to [0,1]
  assert.deepEqual(item.rejection_reasons, []);
}

// Low confidence -> overall outcome maps to manual review, not silently approved
{
  const outcome = deriveOutcome({
    items: [normalizeItem({ category: 'furniture', donation_suitability: 'needs_manual_review', confidence: 0.3 })],
    overall_confidence: 0.3,
  });
  assert.equal(outcome.outcome, 'ADMIN_REVIEW');
  assert.equal(outcome.overall_suitability, 'needs_manual_review');
}

// Worst-item-wins when overall_suitability isn't provided by the model
{
  const items = [
    normalizeItem({ category: 'chair', donation_suitability: 'suitable', confidence: 0.9 }),
    normalizeItem({ category: 'mattress', donation_suitability: 'not_suitable', confidence: 0.9, rejection_reasons: ['stained'] }),
  ];
  const outcome = deriveOutcome({ items });
  assert.equal(outcome.outcome, 'OFFER_PAID_JUNK_REMOVAL');
  assert.deepEqual(outcome.rejection_reasons, ['stained']);
}

// Fully suitable -> AI_APPROVED
{
  const items = [normalizeItem({ category: 'chair', donation_suitability: 'suitable', confidence: 0.95 })];
  const outcome = deriveOutcome({ items, overall_suitability: 'suitable', overall_confidence: 0.95 });
  assert.equal(outcome.outcome, 'AI_APPROVED');
}

// ============================================================
// PHOTO SUFFICIENCY
// ============================================================

const fullPhotoSet = [
  { photo_type: 'full_item_view' },
  { photo_type: 'condition_close_up' },
  { photo_type: 'damage_photo' },
  { photo_type: 'total_quantity_context' },
];

// Complete evidence + high confidence + all suitable -> sufficient
{
  const result = evaluatePhotoSufficiency({
    photos: fullPhotoSet,
    analysis: { confidence: 0.9, suitability: 'suitable', additional_photo_requirements: [] },
    items: [{ donation_suitability: 'suitable', hazmat_indicators: [], pest_contamination_indicators: [] }],
    policy: { manual_review_threshold: 0.72 },
  });
  assert.equal(result.status, 'sufficient');
}

// Missing a required base photo category
{
  const result = evaluatePhotoSufficiency({
    photos: [{ photo_type: 'full_item_view' }],
    analysis: { confidence: 0.9 },
    items: [],
    policy: null,
  });
  assert.equal(result.status, 'more_photos_required');
  assert.ok(result.missing_evidence.includes(MISSING_EVIDENCE_REASONS.MISSING_DAMAGE_CLOSE_UP));
}

// Unclear scale reported by the vision model -> specific evidence gap, not a vague resend
{
  const result = evaluatePhotoSufficiency({
    photos: fullPhotoSet,
    analysis: { confidence: 0.8, additional_photo_requirements: ['need a photo showing scale reference'] },
    items: [],
    policy: null,
  });
  assert.equal(result.status, 'more_photos_required');
  assert.deepEqual(result.missing_evidence, [MISSING_EVIDENCE_REASONS.SCALE_UNCLEAR]);
  assert.ok(result.requested_photo_types.length > 0);
}

// Possible contamination -> manual review, not automatic rejection
{
  const result = evaluatePhotoSufficiency({
    photos: fullPhotoSet,
    analysis: { confidence: 0.85, additional_photo_requirements: [] },
    items: [{ donation_suitability: 'needs_manual_review', pest_contamination_indicators: ['possible bed bugs'], hazmat_indicators: [] }],
    policy: { manual_review_threshold: 0.72 },
  });
  assert.equal(result.status, 'manual_review_required');
}

// Clearly not suitable + high confidence + no hazmat ambiguity -> automatic rejection
{
  const result = evaluatePhotoSufficiency({
    photos: fullPhotoSet,
    analysis: { confidence: 0.95, additional_photo_requirements: [] },
    items: [{ donation_suitability: 'not_suitable', hazmat_indicators: [], pest_contamination_indicators: [] }],
    policy: { manual_review_threshold: 0.72 },
  });
  assert.equal(result.status, 'automatic_rejection');
}

// ============================================================
// CAPACITY ESTIMATION
// ============================================================

// Stackable, non-fragile items
{
  const est = deriveCapacityEstimate([
    { category: 'box', quantity: 3, volume_cuft: 2, weight_kg: 5, confidence: 0.9 },
  ], {});
  assert.equal(est.stackable, true);
  assert.equal(est.fragile, false);
  assert.equal(est.is_conservative, false);
}

// Fragile item forces moving_blankets + non-stackable
{
  const est = deriveCapacityEstimate([
    { category: 'electronics', subtype: 'TV', quantity: 1, weight_kg: 20, confidence: 0.9 },
  ], {});
  assert.equal(est.fragile, true);
  assert.equal(est.stackable, false);
  assert.ok(est.required_equipment.includes('moving_blankets'));
}

// Multiple items sum correctly across quantity
{
  const est = deriveCapacityEstimate([
    { category: 'chair', quantity: 4, volume_cuft: 5, weight_kg: 10, confidence: 0.9 },
    { category: 'table', quantity: 1, volume_cuft: 20, weight_kg: 30, confidence: 0.9 },
  ], {});
  assert.equal(est.volume_cuft, 4 * 5 + 20); // 40
}

// Weight over 80kg forces a dolly + 3-person crew
{
  const est = deriveCapacityEstimate([
    { category: 'appliance', subtype: 'fridge', quantity: 1, weight_kg_max: 120, confidence: 0.9 },
  ], {});
  assert.ok(est.required_equipment.includes('dolly'));
  assert.equal(est.crew_count, 3);
}

// Low confidence -> conservative multiplier widens the estimate
{
  const base = { category: 'sofa', quantity: 1, volume_cuft: 40, weight_kg: 60 };
  const confident = deriveCapacityEstimate([{ ...base, confidence: 0.95 }], {});
  const unsure = deriveCapacityEstimate([{ ...base, confidence: 0.2 }], {});
  assert.equal(unsure.is_conservative, true);
  assert.ok(unsure.volume_cuft > confident.volume_cuft);
  assert.equal(unsure.crew_count, 3); // conservative -> pad the crew too
}

// No items at all -> still conservative, never silently zero-crew
{
  const est = deriveCapacityEstimate([], {});
  assert.equal(est.is_conservative, true);
  assert.equal(est.crew_count, 3);
}

// ============================================================
// ROUTE FIT (decideRouteFit — pure hard-rule evaluator)
// ============================================================

const baseConfig = { truckCapacityKg: 700, maxJobsPerTruck: 6, safetyBufferMin: 15, delayToleranceMin: 10, crewShiftMaxMin: 600 };
const baseCapacity = { weight_kg_max: 50, pickup_duration_minutes: 20, loading_duration_minutes: 15, required_equipment: [], fragile: false, crew_count: 2, confidence: 0.8 };
const openDestination = { considered: true, rejection_reason: null };
const donationRequest = { lat: 51.05, lng: -114.07 };
const crewAssignment = { id: 'crew-1', status: 'scheduled' };

function routePlan(stops, version = 1) {
  return { id: 'route-1', route_version: version, stops };
}

// Fits current route: empty route, ample capacity, accepted destination
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan([]), capacity: baseCapacity, paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'fits_current_route');
}

// Paid-job window violation: b1 is locked in_progress (can't reorder before it), so the
// donation stop must insert right after it — pushing b2's tight window past tolerance.
{
  const stops = [
    { id: 'b1', type: 'customer', status: 'in_progress', lat: 51.00, lng: -114.00 },
    { id: 'b2', type: 'customer', status: 'upcoming', lat: 52.00, lng: -115.00 },
  ];
  const result = decideRouteFit({
    donationRequest: { lat: 51.001, lng: -114.001 }, crewAssignment, routePlan: routePlan(stops),
    capacity: { ...baseCapacity, pickup_duration_minutes: 60, loading_duration_minutes: 60 },
    paidBookings: [
      { id: 'b1', job_window_end: '09:00', status: 'confirmed' },
      { id: 'b2', job_window_end: '09:00', status: 'confirmed' },
    ],
    destinationCandidate: openDestination, config: { ...baseConfig, safetyBufferMin: 5, delayToleranceMin: 5 },
  });
  assert.ok(['reject', 'fits_with_modification'].includes(result.decision));
  assert.ok(result.reasons.includes('paid_job_window_violation'));
}

// Truck capacity violation
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan([]),
    capacity: { ...baseCapacity, weight_kg_max: 900 },
    paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'hold_for_future_route');
  assert.ok(result.reasons.includes('truck_capacity_violation'));
}

// Closed / non-accepting destination
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan([]), capacity: baseCapacity, paidBookings: [],
    destinationCandidate: { considered: false, rejection_reason: 'closed' }, config: baseConfig,
  });
  assert.equal(result.decision, 'reject');
  assert.ok(result.reasons.includes('closed_or_non_accepting_destination'));
}

// Crew shift limit violation
{
  const manyStops = Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, type: 'customer', status: 'upcoming', lat: 51.05, lng: -114.07 }));
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan(manyStops), capacity: baseCapacity,
    paidBookings: [], destinationCandidate: openDestination, config: { ...baseConfig, crewShiftMaxMin: 60, maxJobsPerTruck: 50 },
  });
  assert.equal(result.decision, 'hold_for_future_route');
  assert.ok(result.reasons.includes('crew_shift_limit_violation'));
}

// Stale route version — caller's expected version no longer matches the live one
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan([], 3), expectedRouteVersion: 2,
    capacity: baseCapacity, paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'reject');
  assert.deepEqual(result.reasons, ['stale_route_version']);
}

// Hold for future route: no route plan generated yet
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: null, capacity: baseCapacity, paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'hold_for_future_route');
}

// Active manager lock -> another route should be tried, not this one
{
  const result = decideRouteFit({
    donationRequest, crewAssignment, routePlan: routePlan([]), lockingProposalsCount: 1,
    capacity: baseCapacity, paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'fits_another_route');
  assert.ok(result.reasons.includes('active_manager_lock'));
}

// Missing pickup coordinates -> hard reject, never guessed
{
  const result = decideRouteFit({
    donationRequest: { lat: null, lng: null }, crewAssignment, routePlan: routePlan([]),
    capacity: baseCapacity, paidBookings: [], destinationCandidate: openDestination, config: baseConfig,
  });
  assert.equal(result.decision, 'reject');
  assert.deepEqual(result.reasons, ['missing_pickup_coordinates']);
}

// haversineKm / toMinutes sanity
assert.ok(haversineKm(51.05, -114.07, 51.05, -114.07) === 0);
assert.equal(toMinutes('09:30'), 570);
assert.equal(toMinutes(null), null);
assert.equal(findBestInsertion([], { lat: 51.05, lng: -114.07 }).index, 0);

// ============================================================
// DESTINATION SCORING
// ============================================================

const pickupPoint = { lat: 51.05, lng: -114.07 };

// ReStore selected: resale-friendly item, high resale_potential -> scores well
{
  const restore = { destination_type: 'restore', resale_potential: 'high', lat: 51.05, lng: -114.07, operating_hours: {}, accepted_categories: [], rejected_categories: [] };
  const result = scoreDonationCenterCandidate(restore, { categories: ['furniture'], pickup: pickupPoint, resaleFriendly: true });
  assert.equal(result.considered, true);
  assert.ok(result.score_breakdown.resale_bonus > 0);
}

// Donation centre rejects a category it doesn't accept
{
  const center = { destination_type: 'donation_centre', rejected_categories: ['mattress'], accepted_categories: [], operating_hours: {} };
  const result = scoreDonationCenterCandidate(center, { categories: ['mattress'], pickup: pickupPoint, resaleFriendly: false });
  assert.equal(result.considered, false);
  assert.equal(result.rejection_reason, 'category_not_accepted');
}

// Storage selected when it has available capacity
{
  const facility = { is_active: true, current_usage_pct: 20, lat: 51.05, lng: -114.07 };
  const result = scoreStorageCandidate(facility, { pickup: pickupPoint });
  assert.equal(result.considered, true);
  assert.ok(result.score > 0);
}

// Storage at capacity is rejected
{
  const facility = { is_active: true, current_usage_pct: 97 };
  const result = scoreStorageCandidate(facility, { pickup: pickupPoint });
  assert.equal(result.considered, false);
  assert.equal(result.rejection_reason, 'storage_at_capacity');
}

// Closed destination rejected
{
  const center = { destination_type: 'donation_centre', accepted_categories: [], rejected_categories: [], operating_hours: { mon: 'closed', tue: 'closed', wed: 'closed', thu: 'closed', fri: 'closed', sat: 'closed', sun: 'closed' } };
  const result = scoreDonationCenterCandidate(center, { categories: ['furniture'], pickup: pickupPoint, resaleFriendly: false });
  assert.equal(result.considered, false);
  assert.equal(result.rejection_reason, 'closed');
}

// Rehaul inventory selected for a resale-friendly item
{
  const rehaul = { destination_type: 'rehaul_inventory', resale_potential: 'medium', lat: 51.05, lng: -114.07, operating_hours: {}, accepted_categories: [], rejected_categories: [] };
  const result = scoreDonationCenterCandidate(rehaul, { categories: ['furniture'], pickup: pickupPoint, resaleFriendly: true });
  assert.equal(result.considered, true);
  assert.ok(result.score_breakdown.resale_bonus >= 0);
}

// Landfill fallback only ever produces a low base score (last resort, never the default pick)
{
  const result = scoreLandfillCandidate({ lat: 51.05, lng: -114.07 }, { pickup: pickupPoint });
  assert.ok(result.score < 20);
}

// ============================================================
// PERMISSIONS
// ============================================================

// donations.route_match must NOT be owner-only — a manager can be granted it (via migration seed)
assert.equal(OWNER_ONLY_PERMISSIONS.has('donations.route_match'), false);
assert.equal(OWNER_ONLY_PERMISSIONS.has('donations.review'), false);
// but truly sensitive actions stay owner-only regardless of this phase's work
assert.equal(OWNER_ONLY_PERMISSIONS.has('refunds.issue'), true);

console.log('donation-intelligence.test.js: all assertions passed');
