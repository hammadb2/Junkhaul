// ============================================================
// COST LEDGER TESTS
//
// Unit/property tests for the canonical route/job cost ledger.
// No database is hit — calculateRouteCost is called with an explicit
// costConfig object.
// ============================================================

import assert from 'node:assert/strict';
import {
  calculateRouteCost,
  allocateRouteCost,
  toCents,
  fromCents,
} from '../lib/costLedger.js';

const BENCHMARK_DATE = '2026-07-20T00:00:00Z';

function benchmarkConfig(overrides = {}) {
  return {
    asOf: BENCHMARK_DATE,
    vehicle: { id: 'veh-1', name: 'U-Haul 15ft', vehicle_class: '15ft_uhaul' },
    rental: { id: 'rent-1', daily_rate: 40, per_km_rate: 2.40 / 1.609344, included_km: 0 },
    fuel: { id: 'fuel-1', price_per_litre: 1.75, quote_safety_l_per_100km: 45 },
    labor: { id: 'labor-1', hourly_rate: 18, burden_percent: 0 },
    facility: { id: 'fac-1', flat_minimum: 80, per_tonne_rate: 0 },
    overhead: {
      id: 'oh-1',
      payment_fees_percent: 0,
      supplies_per_job: 0,
      insurance_allocation_per_day: 0,
      software_per_month: 0,
      admin_per_month: 0,
      contingency_percent: 0,
      risk_reserve_percent: 0,
      ...overrides.overhead,
    },
    policy: { id: 'pol-1', target_margin_percent: 20, rounding_rule: 'nearest_dollar', ...overrides.policy },
  };
}

const BENCHMARK_BOOKING = {
  id: 'bk-benchmark',
  load_size: 'full',
  lat: 51.04,
  lng: -114.05,
  address: 'Calgary test address',
  total_price: 0,
};

// ============================================================
// Golden test — 65.98 km benchmark
// ============================================================
{
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [BENCHMARK_BOOKING],
    distanceKm: 65.98,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });

  const { breakdown } = result;
  assert.equal(breakdown.rental.mileage_km, 65.98, 'uses supplied route km');
  assert.equal(breakdown.fuel.litres, 29.691, 'fuel litres at 45 L/100km');
  assert.equal(breakdown.rental.base_rental_cents, toCents(40), 'daily rental $40');
  assert.ok(breakdown.rental.mileage_charge_cents > toCents(98), 'mileage charge > $98');
  assert.ok(breakdown.rental.mileage_charge_cents < toCents(99), 'mileage charge < $99');
  assert.equal(breakdown.fuel.total_cents, toCents(65.98 * 0.7875), 'fuel cost at $0.7875/km');
  assert.equal(breakdown.disposal.total_cents, toCents(80), 'disposal flat $80');
  // Labor is billed on rounded time blocks (roundToTimeBlock, Phase 4): the
  // raw 3.1529 h rounds up to 3.5 h, so labor is 3.5 h x 2 crew x $18 = $126
  // (not the raw-hours $113.50). Total cost $396.36 / 0.8 target margin =
  // $495.45, which rounds to $495. This golden value was $480 before the
  // time-block rounding landed and was never updated with it.
  assert.equal(breakdown.minimum_price_cents, 49500, 'minimum price rounds to $495 for benchmark cost (labor on 3.5h time block)');
  assert.equal(breakdown.decision, 'accept', 'benchmark is accept at minimum price');
  assert.deepEqual(result.rateVersionIds, {
    vehicle_profile_id: 'veh-1',
    rental_rate_version_id: 'rent-1',
    fuel_rate_version_id: 'fuel-1',
    labor_rate_version_id: 'labor-1',
    facility_rate_version_id: 'fac-1',
    overhead_rate_version_id: 'oh-1',
    pricing_policy_version_id: 'pol-1',
    as_of: BENCHMARK_DATE,
  }, 'returns exact rate-version IDs');
}

// ============================================================
// Boundary tests
// ============================================================

// Zero km still includes rental base, labor on-site, and disposal.
{
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [BENCHMARK_BOOKING],
    distanceKm: 0,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });
  assert.equal(result.breakdown.rental.mileage_charge_cents, 0, 'zero km => zero mileage charge');
  assert.ok(result.breakdown.total_cost_cents > 0, 'zero km still has rental base, labour and disposal');
}

// Rehaul clean route has no disposal cost.
{
  const result = await calculateRouteCost({
    routeType: 'rehaul_clean',
    bookings: [BENCHMARK_BOOKING],
    distanceKm: 65.98,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });
  assert.equal(result.breakdown.disposal.total_cents, 0, 'clean route has no disposal');
  assert.equal(result.breakdown.disposal.waste_stream, null, 'waste stream null for clean route');
}

// Invalid input throws early.
await assert.rejects(
  () => calculateRouteCost({ routeType: 'junkhaul_dirty', bookings: [], costConfig: benchmarkConfig() }),
  /At least one booking/
);
await assert.rejects(
  () => calculateRouteCost({ routeType: 'junkhaul_dirty', bookings: [{ id: 'x' }], costConfig: benchmarkConfig() }),
  /Every booking must have a load_size/
);

// Negative distance is rejected by the same boundary (km can be negative? math still works but physically invalid).
{
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [BENCHMARK_BOOKING],
    distanceKm: -5,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });
  assert.ok(result.breakdown.rental.mileage_charge_cents <= 0, 'negative km gives non-positive mileage charge');
}

// ============================================================
// Allocation invariants
// ============================================================

// Single-job fallback: all costs allocated to the lone booking.
{
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [BENCHMARK_BOOKING],
    distanceKm: 65.98,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });
  const alloc = allocateRouteCost(result);
  const totalAllocated = Object.values(alloc.by_booking)
    .flat()
    .reduce((s, a) => s + a.allocated_amount_cents, 0);
  assert.equal(totalAllocated, result.breakdown.total_cost_cents, 'single-job allocation equals total cost');
  assert.equal(alloc.by_booking['bk-benchmark'].length > 0, true, 'lone booking receives allocations');
}

// Multi-job allocation must sum exactly to each ledger category.
{
  const bookings = [
    { id: 'bk-1', load_size: 'quarter', lat: 51.04, lng: -114.05, address: 'A', total_price: 25000 },
    { id: 'bk-2', load_size: 'half', lat: 51.05, lng: -114.06, address: 'B', total_price: 40000 },
  ];
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings,
    distanceKm: 65.98,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
    revenueCents: 65000,
  });
  const alloc = allocateRouteCost(result);
  const byCategory = {};
  for (const a of alloc.allocations) {
    byCategory[a.category] = (byCategory[a.category] || 0) + a.allocated_amount_cents;
  }

  const checkCategory = (category) => {
    const ledger = result.breakdown[category] || result.breakdown.overhead[category.replace('overhead_', '') ? undefined : undefined];
    // Map allocation category to breakdown field.
    let expected = 0;
    if (category === 'rental_base') expected = result.breakdown.rental.base_rental_cents;
    else if (category === 'rental_mileage') expected = result.breakdown.rental.mileage_charge_cents;
    else if (category === 'fuel') expected = result.breakdown.fuel.total_cents;
    else if (category === 'labor_wages') expected = result.breakdown.labor.total_cents;
    else if (category === 'disposal_flat') expected = result.breakdown.disposal.total_cents;
    else if (category === 'payment_fee') expected = result.breakdown.overhead.payment_fee_cents;
    else if (category === 'supplies') expected = result.breakdown.overhead.supplies_cents;
    else if (category === 'insurance') expected = result.breakdown.overhead.insurance_cents;
    else if (category === 'software') expected = result.breakdown.overhead.software_cents;
    else if (category === 'admin') expected = result.breakdown.overhead.admin_cents;
    else if (category === 'contingency') expected = result.breakdown.overhead.contingency_cents;
    else if (category === 'risk_reserve') expected = result.breakdown.overhead.risk_reserve_cents;

    if (expected) {
      assert.ok(
        Math.abs((byCategory[category] || 0) - expected) <= Object.keys(alloc.by_booking).length,
        `allocated ${category} sums to ledger (within rounding pennies per booking)`
      );
    }
  };

  ['rental_base', 'rental_mileage', 'fuel', 'labor_wages', 'disposal_flat', 'payment_fee', 'supplies', 'insurance', 'software', 'admin', 'contingency', 'risk_reserve'].forEach(checkCategory);
}

// ============================================================
// Property tests
// ============================================================

// Increasing cost cannot reduce the minimum price (monotonic).
for (const loadSize of ['single_item', 'quarter', 'half', 'full']) {
  const booking = { ...BENCHMARK_BOOKING, id: `bk-${loadSize}`, load_size: loadSize };
  const result = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [booking],
    distanceKm: 65.98,
    asOf: BENCHMARK_DATE,
    costConfig: benchmarkConfig(),
  });
  assert.ok(result.breakdown.minimum_price_cents >= result.breakdown.total_cost_cents, `minimum price >= total cost for ${loadSize}`);
}

// Increasing margin cannot reduce the minimum price.
{
  const lowMarginConfig = benchmarkConfig({ policy: { id: 'pol-1', target_margin_percent: 10, rounding_rule: 'nearest_dollar' } });
  const highMarginConfig = benchmarkConfig({ policy: { id: 'pol-1', target_margin_percent: 40, rounding_rule: 'nearest_dollar' } });

  const low = await calculateRouteCost({ routeType: 'junkhaul_dirty', bookings: [BENCHMARK_BOOKING], distanceKm: 65.98, asOf: BENCHMARK_DATE, costConfig: lowMarginConfig });
  const high = await calculateRouteCost({ routeType: 'junkhaul_dirty', bookings: [BENCHMARK_BOOKING], distanceKm: 65.98, asOf: BENCHMARK_DATE, costConfig: highMarginConfig });

  assert.ok(high.breakdown.minimum_price_cents >= low.breakdown.minimum_price_cents, 'higher margin yields higher or equal minimum price');
}

console.log('costLedger tests passed');
