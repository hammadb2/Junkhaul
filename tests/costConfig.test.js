import assert from 'node:assert/strict';
import {
  computeRentalCost,
  computeFuelCost,
  computeLaborCost,
  computeFacilityCost,
  computeOverheadAllocation,
  quotePriceFromCost,
  getCostConfig,
  resolveEffectiveVersion,
  DEFAULT_VEHICLE_CLASS,
} from '../lib/costConfig.js';

// Pure function tests with mock rate rows.
const rentalRate = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  daily_rate: 40,
  included_km: 0,
  per_km_rate: 1.491,
};
const fuelRate = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  price_per_litre: 1.75,
  quote_safety_l_per_100km: 45,
};
const laborRate = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  hourly_rate: 18,
  burden_percent: 0,
};
const facilityRate = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  flat_minimum: 80,
  item_fees: {},
};
const overheadRate = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  payment_fees_percent: 0,
  supplies_per_job: 0,
  insurance_allocation_per_day: 0,
  software_per_month: 0,
  admin_per_month: 0,
  contingency_percent: 0,
  risk_reserve_percent: 0,
};
const pricingPolicy = {
  status: 'active',
  effective_from: '2026-07-01T00:00:00Z',
  effective_to: null,
  target_margin_percent: 20,
  rounding_rule: 'nearest_dollar',
};

const vehicleProfile = {
  id: 'vp-1',
  name: 'U-Haul 15ft',
  vehicle_class: DEFAULT_VEHICLE_CLASS,
  active: true,
};

const tableData = {
  rental_rate_versions: [rentalRate],
  fuel_rate_versions: [fuelRate],
  labor_rate_versions: [laborRate],
  facility_rate_versions: [facilityRate],
  overhead_rate_versions: [overheadRate],
  pricing_policy_versions: [pricingPolicy],
  vehicle_profiles: [vehicleProfile],
};

// 65.98 km benchmark: $40 rental + 65.98 * 1.491 + 65.98 * 0.7875 + 80 + labor
const distanceKm = 65.98;
const rental = computeRentalCost({ rentalRate, distanceKm });
const fuel = computeFuelCost({ fuelRate, distanceKm });
const labor = computeLaborCost({ laborRate, hours: 3, people: 2 });
const facility = computeFacilityCost({ facilityRate });

assert.equal(rental, 138.38, 'rental = $40 + 65.98km * $1.491/km');
assert.equal(fuel, 51.96, 'fuel = 65.98km * $0.7875/km');
assert.equal(labor, 108, '2 crew * $18/h * 3h = $108');
assert.equal(facility, 80);

const cost = rental + fuel + labor + facility;
assert.equal(quotePriceFromCost({ cost, pricingPolicy }), 473, 'cost + 20% margin rounded to nearest dollar');

// Overhead calculation
const overhead = computeOverheadAllocation({ overheadRate, revenue: 498, days: 1, jobsPerMonth: 100 });
assert.equal(overhead, 0, 'placeholder overhead should be zero');

// Mock Supabase-style query builder.
function createChain(table) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    lte: () => chain,
    or: () => chain,
    neq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => chain,
    then(onFulfilled) {
      const result = onFulfilled({ data: tableData[table] || [], error: null });
      return Promise.resolve(result);
    },
  };
  return chain;
}

const mockClient = {
  from: (table) => createChain(table),
};

const cfg = await getCostConfig({ asOf: '2026-07-20T00:00:00Z', client: mockClient });
assert.equal(cfg.rental.daily_rate, 40);
assert.equal(cfg.fuel.price_per_litre, 1.75);
assert.equal(cfg.labor.hourly_rate, 18);
assert.equal(cfg.facility.flat_minimum, 80);
assert.equal(cfg.policy.target_margin_percent, 20);
assert.equal(cfg.vehicle.vehicle_class, DEFAULT_VEHICLE_CLASS);

// Historical quote resolution: changing tomorrow's fuel rate cannot alter yesterday's quote.
const fuelVersions = [
  { ...fuelRate, status: 'superseded', effective_from: '2026-01-01T00:00:00Z', effective_to: '2026-07-20T00:00:00Z' },
  { ...fuelRate, price_per_litre: 2.0, status: 'active', effective_from: '2026-07-20T00:00:00Z', effective_to: null },
];
const pastQuoteFuel = resolveEffectiveVersion(fuelVersions, '2026-06-15T12:00:00Z');
const futureQuoteFuel = resolveEffectiveVersion(fuelVersions, '2026-08-01T12:00:00Z');
assert.equal(pastQuoteFuel.price_per_litre, 1.75);
assert.equal(futureQuoteFuel.price_per_litre, 2.0);

console.log('costConfig tests passed');
