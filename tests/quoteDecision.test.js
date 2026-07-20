import assert from 'node:assert/strict';
import { decide } from '../lib/quoteDecision.js';
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

console.log('quoteDecision tests passed');
