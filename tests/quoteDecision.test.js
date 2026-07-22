import assert from 'node:assert/strict';
import { decide, computeConfidenceScore } from '../lib/quoteDecision.js';
import { quotePriceFromCost } from '../lib/costConfig.js';

const pricingPolicy = { target_margin_percent: 20, rounding_rule: 'nearest_dollar' };

// Unit: exact 20% formula; cost $400 requires price $500 before rounding.
assert.equal(quotePriceFromCost({ cost: 400, pricingPolicy }), 500, 'cost $400 at 20% margin -> $500 minimum price');
assert.equal(quotePriceFromCost({ cost: 300, pricingPolicy }), 375, 'cost $300 at 20% margin -> $375 minimum price');

// Decision states
function approvedInput(overrides = {}) {
  return {
    load_size: 'full',
    same_day: false,
    stairs: 0,
    has_freon: false,
    freon_count: 0,
    photos: ['img.jpg'],
    photo_skipped: false,
    description_text: 'couch and boxes',
    ...overrides,
  };
}

const approved = decide({ quoteInput: approvedInput(), priceCents: 50000, minimumPriceCents: 48000, contributionCents: 10000, marginPercent: 20 });
assert.equal(approved.state, 'approved', 'price above minimum and evidence complete => approved');

const manualReview = decide({ quoteInput: approvedInput(), priceCents: 40000, minimumPriceCents: 48000, contributionCents: -8000, marginPercent: -20 });
assert.equal(manualReview.state, 'manual_review', 'price below minimum => manual_review');
assert.equal(manualReview.reasons[0].shortfall_cents, 8000, 'manual review exposes shortfall');

const needsEvidence = decide({ quoteInput: approvedInput({ photos: [], photo_skipped: true, description_text: null }), priceCents: 50000, minimumPriceCents: 48000, contributionCents: 10000, marginPercent: 20 });
assert.equal(needsEvidence.state, 'needs_evidence', 'missing evidence => needs_evidence');

const rejected = decide({ quoteInput: approvedInput(), priceCents: -100, minimumPriceCents: 48000, contributionCents: -100, marginPercent: 0 });
assert.equal(rejected.state, 'rejected', 'negative price => rejected');

const badLoad = decide({ quoteInput: { load_size: 'huge' }, priceCents: 50000, minimumPriceCents: 48000, contributionCents: 10000, marginPercent: 20 });
assert.equal(badLoad.state, 'rejected', 'invalid load size => rejected');

// Monotonicity: increasing cost cannot reduce minimum price.
const p1 = quotePriceFromCost({ cost: 400, pricingPolicy });
const p2 = quotePriceFromCost({ cost: 500, pricingPolicy });
assert.ok(p2 > p1, 'higher cost yields higher minimum price');

// ============================================================
// Phase 3 — profit protection (min $ profit AND min margin %) and
// quote confidence gating. New `policy`/`confidence` params default to
// inert values, so every assertion above this point must still pass
// unchanged (already re-verified: none of them pass policy/confidence).
// ============================================================

// Passes the target-margin floor (price > minimumPriceCents) but falls
// short of a hard dollar-profit floor -> manual_review, not approved.
const belowDollarFloor = decide({
  quoteInput: approvedInput(),
  priceCents: 50000,
  minimumPriceCents: 48000,
  contributionCents: 2000, // only $20 profit
  marginPercent: 4,
  policy: { minimum_contribution_dollars: 30 }, // requires $30 min profit
});
assert.equal(belowDollarFloor.state, 'manual_review', 'below hard dollar profit floor => manual_review even if above minimumPriceCents');
assert.equal(belowDollarFloor.reasons[0].code, 'below_minimum_profit_dollars');

// Falls short of a hard percent floor.
const belowPercentFloor = decide({
  quoteInput: approvedInput(),
  priceCents: 50000,
  minimumPriceCents: 48000,
  contributionCents: 10000,
  marginPercent: 5,
  policy: { minimum_contribution_percent: 10 },
});
assert.equal(belowPercentFloor.state, 'manual_review', 'below hard percent profit floor => manual_review');
assert.equal(belowPercentFloor.reasons[0].code, 'below_minimum_contribution_percent');

// Clears every hard floor but falls under a softer review threshold.
const softReview = decide({
  quoteInput: approvedInput(),
  priceCents: 50000,
  minimumPriceCents: 48000,
  contributionCents: 10000,
  marginPercent: 12,
  policy: { review_thresholds: { margin_review_below_percent: 15 } },
});
assert.equal(softReview.state, 'manual_review', 'margin below soft review threshold => manual_review');
assert.equal(softReview.reasons[0].code, 'margin_below_review_threshold');

// High-value job forces owner review regardless of margin.
const highValue = decide({
  quoteInput: approvedInput(),
  priceCents: 150000, // $1,500
  minimumPriceCents: 48000,
  contributionCents: 50000,
  marginPercent: 33,
  policy: { review_thresholds: { owner_review_above_dollar: 1000 } },
});
assert.equal(highValue.state, 'manual_review', 'price above owner-review dollar threshold => manual_review');
assert.equal(highValue.reasons[0].code, 'high_value_owner_review');

// Low confidence forces manual review even when price/margin are fine.
const lowConfidence = decide({
  quoteInput: approvedInput(),
  priceCents: 50000,
  minimumPriceCents: 48000,
  contributionCents: 10000,
  marginPercent: 20,
  confidence: { score: 30, tier: 'low' },
});
assert.equal(lowConfidence.state, 'manual_review', 'low confidence tier => manual_review');
assert.equal(lowConfidence.reasons[0].code, 'low_confidence_estimate');

// A clean quote with generous policy floors and high confidence still
// approves — Phase 3 adds gates, it doesn't make everything stricter.
const stillApproved = decide({
  quoteInput: approvedInput(),
  priceCents: 50000,
  minimumPriceCents: 48000,
  contributionCents: 10000,
  marginPercent: 20,
  policy: { minimum_contribution_dollars: 10, minimum_contribution_percent: 5, review_thresholds: { margin_review_below_percent: 10, owner_review_above_dollar: 100000 } },
  confidence: { score: 90, tier: 'high' },
});
assert.equal(stillApproved.state, 'approved', 'clearing every floor with high confidence => still approved');

// ---- computeConfidenceScore ----
const highConf = computeConfidenceScore({
  quoteInput: { item_evidence_status: 'complete', ai_confidence: 0.95 },
  marginPercent: 30,
  policy: { minimum_contribution_percent: 10 },
});
assert.equal(highConf.tier, 'high', 'complete evidence + high AI confidence + large margin buffer => high tier');

const lowConf = computeConfidenceScore({
  quoteInput: { item_evidence_status: 'review_required', ai_confidence: 0.2 },
  marginPercent: 10,
  policy: { minimum_contribution_percent: 10 },
});
assert.equal(lowConf.tier, 'low', 'review-required evidence + low AI confidence + zero margin buffer => low tier');

console.log('quoteDecision tests passed');
