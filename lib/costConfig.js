// ============================================================
// COST CONFIG — versioned operating-cost resolution.
//
// All rates are read from the versioned tables created by
// 20260731000001_cost_config_versions.sql. The server chooses which
// version is effective for a quote; the browser never picks the rate.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import {
  roundCurrency,
  roundToNearest,
  fuelCostPerKm,
  priceFromMargin,
  kmToMiles,
} from './unitConversions.js';

export const DEFAULT_VEHICLE_CLASS = '15ft_uhaul';
export const DEFAULT_LABOR_ROLE = 'default_crew';
export const DEFAULT_FACILITY = 'East Calgary Landfill';
export const DEFAULT_WASTE_STREAM = 'general_junk';

// ============================================================
// Effective-version loaders
// ============================================================

export async function getActiveVehicleProfiles(client = supabaseAdmin) {
  const { data, error } = await client.from('vehicle_profiles').select('*').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function getVehicleProfileByClass(vehicleClass, client = supabaseAdmin) {
  const { data, error } = await client.from('vehicle_profiles').select('*').eq('vehicle_class', vehicleClass).single();
  if (error) throw error;
  return data;
}

// ============================================================
// TRUCK SELECTION — the smallest of the 15/20/26ft U-Haul trucks
// (all three are ramp-equipped; no pickup trucks or cargo vans are
// ever considered) that safely handles BOTH the job's volume and its
// weight. A job never gets assigned a truck just because the items
// physically fit — weight must also stay within a safety-buffered
// payload (operational_weight_limit_kg * planned_payload_percent, not
// the truck's full legal rating).
//
// Whichever limit — volume or safe payload — is hit first for a given
// truck disqualifies it; the engine walks the fleet smallest-to-
// largest and returns the first that clears both. If nothing in the
// fleet clears both, `fits` is false and the caller must plan multiple
// trucks/trips instead of silently overloading the largest one.
// ============================================================
export function selectTruckFromProfiles(profiles, { volumeCuft = 0, weightKg = 0 } = {}) {
  const sorted = [...(profiles || [])].sort((a, b) => Number(a.volume_cuft) - Number(b.volume_cuft));
  for (const profile of sorted) {
    const safePayloadKg = Number(profile.operational_weight_limit_kg) * Number(profile.planned_payload_percent ?? 1);
    const fitsVolume = volumeCuft <= Number(profile.volume_cuft);
    const fitsWeight = weightKg <= safePayloadKg;
    if (fitsVolume && fitsWeight) {
      return {
        fits: true,
        profile,
        safePayloadKg,
        limitingFactor: null,
        volumeUsedPercent: Number(profile.volume_cuft) ? (volumeCuft / Number(profile.volume_cuft)) * 100 : 0,
        payloadUsedPercent: safePayloadKg ? (weightKg / safePayloadKg) * 100 : 0,
      };
    }
  }
  // Nothing in the fleet clears both limits on its own — this is a
  // multi-truck / multi-trip job, not an oversized single booking.
  const largest = sorted[sorted.length - 1] || null;
  const largestSafePayloadKg = largest
    ? Number(largest.operational_weight_limit_kg) * Number(largest.planned_payload_percent ?? 1)
    : 0;
  return {
    fits: false,
    profile: largest,
    safePayloadKg: largestSafePayloadKg,
    limitingFactor: largest && volumeCuft > Number(largest.volume_cuft) ? 'volume' : 'weight',
    volumeUsedPercent: largest && Number(largest.volume_cuft) ? (volumeCuft / Number(largest.volume_cuft)) * 100 : null,
    payloadUsedPercent: largestSafePayloadKg ? (weightKg / largestSafePayloadKg) * 100 : null,
  };
}

export async function selectTruckForJob({ volumeCuft = 0, weightKg = 0, client = supabaseAdmin } = {}) {
  const profiles = await getActiveVehicleProfiles(client);
  return selectTruckFromProfiles(profiles, { volumeCuft, weightKg });
}

// Resolve the version whose effective range contains asOf, preferring the
// most recent effective_from among candidates. Drafts are never selected.
export function resolveEffectiveVersion(versions, asOf) {
  const t = new Date(asOf).getTime();
  let best = null;
  for (const v of versions || []) {
    if (v.status === 'draft') continue;
    const from = new Date(v.effective_from).getTime();
    if (Number.isNaN(from) || from > t) continue;
    const to = v.effective_to ? new Date(v.effective_to).getTime() : Infinity;
    if (Number.isFinite(to) && to <= t) continue;
    if (!best || from > new Date(best.effective_from).getTime()) best = v;
  }
  return best;
}

async function getTableVersions(table, scope, client = supabaseAdmin) {
  let q = client.from(table).select('*');
  for (const [key, value] of Object.entries(scope || {})) {
    if (value !== undefined && value !== null && value !== '') q = q.eq(key, value);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getEffectiveRentalRate({
  asOf = new Date().toISOString(),
  vehicleProfileId,
  provider,
  location,
  client = supabaseAdmin,
} = {}) {
  const versions = await getTableVersions('rental_rate_versions', { vehicle_profile_id: vehicleProfileId, provider, location }, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getEffectiveFuelRate({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const versions = await getTableVersions('fuel_rate_versions', {}, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getEffectiveLaborRate({
  asOf = new Date().toISOString(),
  role = DEFAULT_LABOR_ROLE,
  client = supabaseAdmin,
} = {}) {
  const versions = await getTableVersions('labor_rate_versions', { role_or_employee: role }, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getEffectiveFacilityRate({
  asOf = new Date().toISOString(),
  facility = DEFAULT_FACILITY,
  wasteStream = DEFAULT_WASTE_STREAM,
  client = supabaseAdmin,
} = {}) {
  const versions = await getTableVersions('facility_rate_versions', { facility, waste_stream: wasteStream }, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getEffectiveOverheadRate({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const versions = await getTableVersions('overhead_rate_versions', {}, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getEffectivePricingPolicy({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const versions = await getTableVersions('pricing_policy_versions', {}, client);
  return resolveEffectiveVersion(versions, asOf);
}

export async function getCostConfig({
  asOf = new Date().toISOString(),
  vehicleProfileId,
  vehicleClass = DEFAULT_VEHICLE_CLASS,
  provider,
  location,
  facility = DEFAULT_FACILITY,
  wasteStream = DEFAULT_WASTE_STREAM,
  role = DEFAULT_LABOR_ROLE,
  client = supabaseAdmin,
} = {}) {
  const [profiles, rental, fuel, labor, facilityRate, overhead, policy] = await Promise.all([
    getActiveVehicleProfiles(client),
    getEffectiveRentalRate({ asOf, vehicleProfileId, provider, location, client }),
    getEffectiveFuelRate({ asOf, client }),
    getEffectiveLaborRate({ asOf, role, client }),
    getEffectiveFacilityRate({ asOf, facility, wasteStream, client }),
    getEffectiveOverheadRate({ asOf, client }),
    getEffectivePricingPolicy({ asOf, client }),
  ]);
  const vehicle =
    profiles.find((v) => v.id === vehicleProfileId) ||
    profiles.find((v) => v.vehicle_class === vehicleClass) ||
    profiles[0] ||
    null;
  return {
    asOf,
    vehicle,
    rental,
    fuel,
    labor,
    facility: facilityRate,
    overhead,
    policy,
  };
}

// ============================================================
// Pure cost-composition helpers
// ============================================================

export function computeRentalCost({ rentalRate, distanceKm, days = 1, includedKm = 0 }) {
  const daily = Number(rentalRate.daily_rate) * Number(days);
  const chargeableKm = Math.max(0, Number(distanceKm) - Number(includedKm));
  const mileage = roundCurrency(chargeableKm * Number(rentalRate.per_km_rate), 4);
  // Mandatory U-Haul protection charge — applied once per rental, every
  // time a truck goes out. Not optional, not removable by dispatch or the
  // pricing engine; only an admin changing rentalRate.protection_fee in
  // the versioned config can change it.
  const protection = Number(rentalRate.protection_fee || 0);
  return roundCurrency(daily + mileage + protection, 2);
}

// Each truck has its own fuel_baseline_l_per_100km (15/20/26ft consume
// differently), so fuel cost is calculated per-truck, not off a single
// fleet-wide number. vehicleFuelBaselineLPer100km is optional so
// existing callers that don't pass a vehicle profile keep working off
// fuelRate's own flat quote_safety_l_per_100km.
export function computeFuelCost({ fuelRate, distanceKm, vehicleFuelBaselineLPer100km }) {
  const baseline = vehicleFuelBaselineLPer100km ?? fuelRate.quote_safety_l_per_100km;
  const bufferPercent = Number(fuelRate.fuel_safety_buffer_percent || 0);
  // Safety buffer for idling, traffic, detours, landfill lineups, winter
  // conditions, and route inaccuracies — applied on top of the truck's
  // own baseline consumption, not baked silently into the baseline.
  const bufferedLPer100km = Number(baseline) * (1 + bufferPercent / 100);
  const perKm = fuelCostPerKm({
    lPer100km: bufferedLPer100km,
    pricePerLitre: fuelRate.price_per_litre,
  });
  return roundCurrency(perKm * Number(distanceKm), 2);
}

// Round estimated hours UP to the nearest configured time block (e.g. 30
// minutes) — the engine never bills a fraction of a block short, matching
// how a real crew's paid time actually works.
export function roundToTimeBlock(hours, blockMinutes = 30) {
  const blockHours = Number(blockMinutes) / 60;
  if (!blockHours) return Number(hours);
  return Math.ceil(Number(hours) / blockHours) * blockHours;
}

export function computeLaborCost({ laborRate, hours, people = 2 }) {
  const blockedHours = roundToTimeBlock(hours, laborRate.time_block_minutes);
  const base = Number(laborRate.hourly_rate) * Number(people) * blockedHours;
  const burden = 1 + Number(laborRate.burden_percent || 0) / 100;
  return roundCurrency(base * burden, 2);
}

// Real Calgary landfills bill by weight (per tonne), not a flat guess per
// load-size tier — flat_minimum is a floor (a job never costs less than
// the facility's minimum gate fee), not the whole disposal cost. Mirrors
// the same per-tonne-rate formula lib/disposal.js's calculateDisposalCost
// already uses for crew-side actual-vs-estimated reconciliation, so the
// PREDICTED cost that sets the customer's price and the ACTUAL cost a
// crew records at the scale are computed the same way (Pricing Engine
// Phase 7).
export function computeFacilityCost({ facilityRate, loadSize = null, weightKg = 0 }) {
  const flat = Number(facilityRate.flat_minimum || 0);
  const perTonneRate = Number(facilityRate.per_tonne_rate || 0);
  const weightCost = perTonneRate > 0 ? (Number(weightKg) / 1000) * perTonneRate : 0;
  // Item fees are keyed by load_size if present; otherwise fall back to flat.
  const itemFee =
    loadSize && facilityRate.item_fees ? Number(facilityRate.item_fees[loadSize] || 0) : 0;
  return roundCurrency(Math.max(flat, weightCost + itemFee), 2);
}

export function computeOverheadAllocation({ overheadRate, revenue = 0, days = 1, jobsPerMonth = 100 }) {
  const paymentFee = (Number(revenue) * Number(overheadRate.payment_fees_percent || 0)) / 100;
  const daily = Number(overheadRate.insurance_allocation_per_day || 0) * Number(days);
  const monthlyPerJob =
    (Number(overheadRate.software_per_month || 0) + Number(overheadRate.admin_per_month || 0)) /
    Math.max(1, Number(jobsPerMonth));
  const supplies = Number(overheadRate.supplies_per_job || 0);
  const contingency = (Number(revenue) * Number(overheadRate.contingency_percent || 0)) / 100;
  const riskReserve = (Number(revenue) * Number(overheadRate.risk_reserve_percent || 0)) / 100;
  return roundCurrency(paymentFee + daily + monthlyPerJob + supplies + contingency + riskReserve, 2);
}

// ============================================================
// Job cost estimate
// ============================================================

export async function estimateJobCost({
  loadSize,
  distanceKm,
  onSiteMinutes = 30,
  people = 2,
  asOf = new Date().toISOString(),
  vehicleClass = DEFAULT_VEHICLE_CLASS,
  vehicleProfileId,
  // When volumeCuft/weightKg are supplied, they take priority over
  // vehicleClass/vehicleProfileId: the engine selects the smallest of the
  // 15/20/26ft trucks that safely clears BOTH limits (see
  // selectTruckFromProfiles) instead of trusting a caller-picked class.
  volumeCuft,
  weightKg,
  // Landfill-bound weight (Pricing Engine Phase 8) — excludes diverted
  // material like e-waste. Falls back to weightKg (assume all landfill-
  // bound) when not supplied.
  landfillWeightKg,
  provider,
  location,
  facility = DEFAULT_FACILITY,
  wasteStream = DEFAULT_WASTE_STREAM,
  role = DEFAULT_LABOR_ROLE,
  client = supabaseAdmin,
} = {}) {
  let truckSelection = null;
  if (volumeCuft !== undefined || weightKg !== undefined) {
    const profiles = await getActiveVehicleProfiles(client);
    truckSelection = selectTruckFromProfiles(profiles, {
      volumeCuft: volumeCuft || 0,
      weightKg: weightKg || 0,
    });
    if (truckSelection.fits && truckSelection.profile) {
      vehicleClass = truckSelection.profile.vehicle_class;
      vehicleProfileId = truckSelection.profile.id;
    } else if (truckSelection.profile) {
      // Doesn't fit anything — still cost the largest truck for a single
      // leg; the caller (quote/dispatch layer) is responsible for
      // multiplying trips using the `fits: false` signal, not this
      // function pretending one truck handles it.
      vehicleClass = truckSelection.profile.vehicle_class;
      vehicleProfileId = truckSelection.profile.id;
    }
  }

  const cfg = await getCostConfig({
    asOf,
    vehicleClass,
    vehicleProfileId,
    provider,
    location,
    facility,
    wasteStream,
    role,
    client,
  });
  if (!cfg.rental || !cfg.fuel || !cfg.labor || !cfg.facility || !cfg.policy) {
    throw new Error('Missing required cost configuration for job estimate');
  }

  const travelHours = Math.max(0.5, Number(distanceKm) / 50); // ~50 km/h blended Calgary driving
  const hours = travelHours * 2 + Number(onSiteMinutes) / 60; // out and back + on site
  const rentalCost = computeRentalCost({ rentalRate: cfg.rental, distanceKm });
  const fuelCost = computeFuelCost({
    fuelRate: cfg.fuel,
    distanceKm,
    vehicleFuelBaselineLPer100km: cfg.vehicle?.fuel_baseline_l_per_100km,
  });
  const laborCost = computeLaborCost({ laborRate: cfg.labor, hours, people });
  const facilityCost = computeFacilityCost({ facilityRate: cfg.facility, loadSize, weightKg: landfillWeightKg ?? weightKg ?? 0 });
  const overhead = computeOverheadAllocation({ overheadRate: cfg.overhead, revenue: 0, days: 1 });

  const cost = roundCurrency(rentalCost + fuelCost + laborCost + facilityCost + overhead, 2);

  return {
    cost,
    distanceKm: Number(distanceKm),
    hours: roundCurrency(hours, 2),
    truckSelection,
    breakdown: {
      rental: rentalCost,
      fuel: fuelCost,
      labor: laborCost,
      facility: facilityCost,
      overhead,
    },
    configSnapshot: cfg,
  };
}

// ============================================================
// Quote pricing from cost + policy
// ============================================================

export function quotePriceFromCost({ cost, pricingPolicy, roundingRule = pricingPolicy?.rounding_rule || 'nearest_dollar' }) {
  const withMargin = priceFromMargin({ cost, marginPercent: pricingPolicy.target_margin_percent });
  if (roundingRule === 'nearest_5') return roundToNearest(withMargin, 5);
  if (roundingRule === 'nearest_10') return roundToNearest(withMargin, 10);
  if (roundingRule === 'nearest_50') return roundToNearest(withMargin, 50);
  if (roundingRule === 'nearest_dollar') return roundCurrency(withMargin, 0);
  return roundCurrency(withMargin, 2);
}

export async function quotePrice({
  loadSize,
  distanceKm,
  onSiteMinutes = 30,
  asOf = new Date().toISOString(),
  client = supabaseAdmin,
  ...rest
} = {}) {
  const estimate = await estimateJobCost({ loadSize, distanceKm, onSiteMinutes, asOf, client, ...rest });
  const policy = estimate.configSnapshot.policy;
  const price = quotePriceFromCost({ cost: estimate.cost, pricingPolicy: policy });
  return { price, estimate, policy };
}
