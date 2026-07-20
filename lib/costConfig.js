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

function buildEffectiveQuery(q, asOf) {
  return q
    .lte('effective_from', asOf)
    .or(`effective_to.is.null,effective_to.gt.${asOf}`)
    .neq('status', 'draft')
    .order('effective_from', { ascending: false })
    .limit(1);
}

export async function getEffectiveRentalRate({
  asOf = new Date().toISOString(),
  vehicleProfileId,
  provider,
  location,
  client = supabaseAdmin,
} = {}) {
  let q = client.from('rental_rate_versions').select('*');
  if (vehicleProfileId) q = q.eq('vehicle_profile_id', vehicleProfileId);
  if (provider) q = q.eq('provider', provider);
  if (location) q = q.eq('location', location);
  const { data, error } = await buildEffectiveQuery(q, asOf);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getEffectiveFuelRate({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const { data, error } = await buildEffectiveQuery(client.from('fuel_rate_versions').select('*'), asOf);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getEffectiveLaborRate({
  asOf = new Date().toISOString(),
  role = DEFAULT_LABOR_ROLE,
  client = supabaseAdmin,
} = {}) {
  const { data, error } = await buildEffectiveQuery(
    client.from('labor_rate_versions').select('*').eq('role_or_employee', role),
    asOf
  );
  if (error) throw error;
  return data?.[0] || null;
}

export async function getEffectiveFacilityRate({
  asOf = new Date().toISOString(),
  facility = DEFAULT_FACILITY,
  wasteStream = DEFAULT_WASTE_STREAM,
  client = supabaseAdmin,
} = {}) {
  const { data, error } = await buildEffectiveQuery(
    client.from('facility_rate_versions').select('*').eq('facility', facility).eq('waste_stream', wasteStream),
    asOf
  );
  if (error) throw error;
  return data?.[0] || null;
}

export async function getEffectiveOverheadRate({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const { data, error } = await buildEffectiveQuery(client.from('overhead_rate_versions').select('*'), asOf);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getEffectivePricingPolicy({ asOf = new Date().toISOString(), client = supabaseAdmin } = {}) {
  const { data, error } = await buildEffectiveQuery(client.from('pricing_policy_versions').select('*'), asOf);
  if (error) throw error;
  return data?.[0] || null;
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
  return roundCurrency(daily + mileage, 2);
}

export function computeFuelCost({ fuelRate, distanceKm }) {
  const perKm = fuelCostPerKm({
    lPer100km: fuelRate.quote_safety_l_per_100km,
    pricePerLitre: fuelRate.price_per_litre,
  });
  return roundCurrency(perKm * Number(distanceKm), 2);
}

export function computeLaborCost({ laborRate, hours, people = 2 }) {
  const base = Number(laborRate.hourly_rate) * Number(people) * Number(hours);
  const burden = 1 + Number(laborRate.burden_percent || 0) / 100;
  return roundCurrency(base * burden, 2);
}

export function computeFacilityCost({ facilityRate, loadSize = null }) {
  const flat = Number(facilityRate.flat_minimum || 0);
  // Item fees are keyed by load_size if present; otherwise fall back to flat.
  const itemFee =
    loadSize && facilityRate.item_fees ? Number(facilityRate.item_fees[loadSize] || 0) : 0;
  return roundCurrency(flat + itemFee, 2);
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
  provider,
  location,
  facility = DEFAULT_FACILITY,
  wasteStream = DEFAULT_WASTE_STREAM,
  role = DEFAULT_LABOR_ROLE,
  client = supabaseAdmin,
} = {}) {
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
  const fuelCost = computeFuelCost({ fuelRate: cfg.fuel, distanceKm });
  const laborCost = computeLaborCost({ laborRate: cfg.labor, hours, people });
  const facilityCost = computeFacilityCost({ facilityRate: cfg.facility, loadSize });
  const overhead = computeOverheadAllocation({ overheadRate: cfg.overhead, revenue: 0, days: 1 });

  const cost = roundCurrency(rentalCost + fuelCost + laborCost + facilityCost + overhead, 2);

  return {
    cost,
    distanceKm: Number(distanceKm),
    hours: roundCurrency(hours, 2),
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
