import assert from 'node:assert/strict';
import { classifyItems, calculateDisposalCost, toCents } from '../lib/disposal.js';

// classifyItems groups by stream and flags uncertainty.
const classified = classifyItems(['old couch', 'metal bed frame', 'fridge']);
const donation = classified.find((c) => c.stream === 'donation');
const metal = classified.find((c) => c.stream === 'metal');
const appliance = classified.find((c) => c.stream === 'appliance');
assert.ok(donation, 'couch classified as donation');
assert.ok(metal, 'bed frame classified as metal');
assert.ok(appliance, 'fridge classified as appliance');

// calculateDisposalCost for under-minimum and per-tonne above.
const under = calculateDisposalCost({ netWeightKg: 100, rate: { flat_minimum_cents: toCents(40), per_tonne_rate_cents: toCents(120) } });
assert.equal(under.total_cost_cents, toCents(40), '100kg load pays flat minimum');

const over = calculateDisposalCost({ netWeightKg: 500, rate: { flat_minimum_cents: toCents(40), per_tonne_rate_cents: toCents(120) } });
assert.equal(over.total_cost_cents, toCents(60), '500kg at $120/tonne = $60');

// Surcharges and item fees.
const withSurcharge = calculateDisposalCost({
  netWeightKg: 200,
  rate: {
    flat_minimum_cents: 0,
    per_tonne_rate_cents: toCents(100),
  },
  surcharges: { hard_to_handle_per_kg: 0.05 },
  itemFees: { mattress: 20 },
  items: [{ name: 'mattress' }],
});
const expectedWeight = Math.round(toCents(100) * 0.2);
const expectedSurcharge = Math.round(toCents(0.05) * 200);
const expectedFee = toCents(20);
assert.equal(withSurcharge.total_cost_cents, expectedWeight + expectedSurcharge + expectedFee, 'surcharge + item fee added');

console.log('disposal tests passed');
