import assert from 'node:assert/strict';
import { validateRouteFeasibility } from '../lib/dispatch.js';

const vehicle = { operational_weight_limit_kg: 2500, volume_cuft: 764 };

// Route within limits and complete evidence is feasible.
const okPlan = {
  vehicle_snapshot: vehicle,
  stops: [
    { type: 'customer', sequence: 1, booking_id: 'b1', weight_kg_after: 500, volume_pct_after: 25 },
    { type: 'customer', sequence: 2, booking_id: 'b2', weight_kg_after: 400, volume_pct_after: 20 },
  ],
};
const okBookings = [
  { id: 'b1', item_evidence_status: 'complete' },
  { id: 'b2', item_evidence_status: 'complete' },
];
const okExc = validateRouteFeasibility(okPlan, okBookings);
assert.equal(okExc.length, 0, 'feasible route has no exceptions');

// Overweight should raise exception.
const heavyPlan = {
  vehicle_snapshot: vehicle,
  stops: [{ type: 'customer', sequence: 1, booking_id: 'b1', weight_kg_after: 2600, volume_pct_after: 30 }],
};
const heavyExc = validateRouteFeasibility(heavyPlan, okBookings);
assert.equal(heavyExc.length, 1, 'overweight triggers one exception');
assert.equal(heavyExc[0].exception_type, 'overweight', 'exception type is overweight');
assert.equal(heavyExc[0].severity, 'high', 'overweight is high severity');

// Missing evidence should raise exception.
const missingPlan = {
  vehicle_snapshot: vehicle,
  stops: [{ type: 'customer', sequence: 1, booking_id: 'b1', weight_kg_after: 100, volume_pct_after: 5 }],
};
const missingBookings = [{ id: 'b1', item_evidence_status: 'pending' }];
const missingExc = validateRouteFeasibility(missingPlan, missingBookings);
assert.ok(missingExc.some((e) => e.exception_type === 'missing_evidence'), 'missing evidence flagged');

console.log('dispatch tests passed');
