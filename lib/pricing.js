// ============================================================
// PRICING ENGINE — server-side pricing with runtime config.
//
// Pure constants and calculatePrice live in lib/pricingConstants.js
// (safe for client imports). This file adds the async config-loading
// functions that require Supabase.
// ============================================================

import { getNumberConfig } from './config';
import {
  DEFAULT_PRICING,
  UHAUL_DAILY_RATE,
  UHAUL_PER_KM,
  getDynamicMultiplier,
  calculatePrice,
} from './pricingConstants';
import { calculateRouteCost, quoteWithCost, fromCents } from './costLedger.js';
import { roundCurrency } from './unitConversions';

// Re-export everything from pricingConstants so existing imports
// from '@/lib/pricing' continue to work on both client and server.
export {
  UHAUL_ADDRESS,
  UHAUL_DAILY_RATE,
  UHAUL_PER_KM,
  TRAVEL_FEE_PER_KM,
  TRAVEL_FEE_PICKUP,
  TRAVEL_FEE_HOME,
  TRUCK_SIZES,
  TRUCK_SIZE_WEIGHT_THRESHOLDS,
  LANDFILLS,
  getLandfillForDay,
  DEFAULT_PRICING,
  LOAD_LABELS,
  PRICING,
  getDynamicMultiplier,
  calculatePrice,
} from './pricingConstants';

// ============================================================
// Load pricing config from system_config. If a row is missing,
// the fallback default is returned. This is async because the
// config table lives in Supabase.
// ============================================================
export const getPricingConfig = async () => {
  return {
    loads: {
      single_item: await getNumberConfig('pricing_load_single_item', DEFAULT_PRICING.loads.single_item),
      quarter: await getNumberConfig('pricing_load_quarter', DEFAULT_PRICING.loads.quarter),
      half: await getNumberConfig('pricing_load_half', DEFAULT_PRICING.loads.half),
      full: await getNumberConfig('pricing_load_full', DEFAULT_PRICING.loads.full),
    },
    same_day: await getNumberConfig('pricing_same_day', DEFAULT_PRICING.same_day),
    stairs_per_flight: await getNumberConfig('pricing_stairs_per_flight', DEFAULT_PRICING.stairs_per_flight),
    freon_per_item: await getNumberConfig('pricing_freon_per_item', DEFAULT_PRICING.freon_per_item),
    weight_limits: {
      single_item: await getNumberConfig('pricing_weight_limit_single_item', DEFAULT_PRICING.weight_limits.single_item),
      quarter: await getNumberConfig('pricing_weight_limit_quarter', DEFAULT_PRICING.weight_limits.quarter),
      half: await getNumberConfig('pricing_weight_limit_half', DEFAULT_PRICING.weight_limits.half),
      full: await getNumberConfig('pricing_weight_limit_full', DEFAULT_PRICING.weight_limits.full),
    },
    deposit: await getNumberConfig('pricing_deposit', DEFAULT_PRICING.deposit),
    early_bird_hour: await getNumberConfig('pricing_early_bird_hour', DEFAULT_PRICING.early_bird_hour),
    early_bird_multiplier: await getNumberConfig('pricing_early_bird_multiplier', DEFAULT_PRICING.early_bird_multiplier),
    surcharge_min: await getNumberConfig('pricing_surcharge_min', DEFAULT_PRICING.surcharge_min),
    surcharge_max: await getNumberConfig('pricing_surcharge_max', DEFAULT_PRICING.surcharge_max),
  };
};

// Async wrapper for server-side callers that want to load config automatically.
export const calculatePriceWithConfig = async (args) => {
  const pricingConfig = await getPricingConfig();
  return calculatePrice({ ...args, pricingConfig });
};

// Map a vehicle_profiles.vehicle_class back to the customer-facing truck
// size number used throughout bookings/UI (15/20/26).
const VEHICLE_CLASS_TO_TRUCK_SIZE = {
  '15ft_uhaul': 15,
  '20ft_uhaul': 20,
  '26ft_uhaul': 26,
};

// ============================================================
// CUSTOMER-FACING PRICE — cost-engine-derived (Phase 2 of the pricing
// engine rebuild).
//
// This REPLACES the flat per-load-size lookup (calculatePrice) as the
// authoritative source of the price customers are actually charged. The
// base price now comes from the real internal cost engine
// (lib/costLedger.js's calculateRouteCost): the smallest 15/20/26ft
// truck that safely covers the job's real weight AND volume, the real
// depot -> customer -> landfill -> depot route distance, live fuel
// price, labor, disposal, overhead, and the admin's target margin —
// instead of a hand-picked flat number per load-size tier.
//
// Same-day/stairs/freon surcharges and the early-bird/surge multiplier
// are kept exactly as before on top of this new base (those become
// calculated line items in later phases, not this one). The old
// truck-size upsell fee ($150/$300) is retired: the engine always picks
// the truck the job actually needs and prices its real cost, so no
// separate flat upsell is needed — `truck_size` in the returned shape
// now reflects what the engine actually selected, not what the
// customer clicked.
//
// Requires a location (lat/lng or a geocodable address) to compute a
// real route distance. Callers that don't yet know the customer's
// address (e.g. an early "here's a rough range" preview before the
// address step) should keep using calculatePrice/calculatePriceWithConfig
// for that non-final estimate — this function is for the price that is
// actually charged.
// ============================================================
export async function quoteCustomerPrice({
  load_size,
  same_day = false,
  stairs = 0,
  has_freon = false,
  freon_count = 0,
  job_date = null,
  job_time = null,
  surge_multiplier = 1.0,
  travel_fee = 0,
  lat,
  lng,
  address = null,
  weight_kg,
  volume_cuft,
  pricingConfig,
  asOf = new Date().toISOString(),
  client,
}) {
  const cfg = pricingConfig || (await getPricingConfig());
  if (!cfg.loads[load_size]) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? cfg.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * cfg.stairs_per_flight;

  const freon_items = has_freon ? Math.max(1, freon_count) : 0;
  const freon_fee = freon_items * cfg.freon_per_item;

  const early_bird_multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time, cfg) : 1.0;
  const combined = early_bird_multiplier * surge_multiplier;
  const multiplier = Math.max(cfg.surcharge_min, Math.min(cfg.surcharge_max, combined));

  const booking = {
    id: `quote-${Date.now()}`,
    load_size,
    lat: typeof lat === 'number' ? lat : undefined,
    lng: typeof lng === 'number' ? lng : undefined,
    address: address || undefined,
    weight_kg: weight_kg || undefined,
    volume_cuft: volume_cuft || undefined,
  };
  const cost = await quoteWithCost({ booking, asOf, client });
  const engineBase = fromCents(cost.breakdown.minimum_price_cents);

  // Same grouping as the old flat formula: stairs/freon are inside the
  // demand multiplier, same-day/travel are flat pass-throughs on top.
  const subtotal = Math.round((engineBase + stairs_fee + freon_fee) * multiplier);
  const total = subtotal + same_day_fee + travel_fee;
  const balance_due = total - cfg.deposit;

  const truck_size = VEHICLE_CLASS_TO_TRUCK_SIZE[cost.truckSelection?.profile?.vehicle_class] || 15;

  return {
    base_price: roundCurrency(engineBase, 2),
    same_day_fee,
    stairs_fee,
    freon_fee,
    freon_count: freon_items,
    travel_fee,
    truck_size,
    truck_fee: 0,
    early_bird_multiplier,
    surge_multiplier,
    dynamic_multiplier: multiplier,
    total,
    deposit: cfg.deposit,
    balance_due,
    // Internal diagnostics — not shown to the customer, but carried
    // through so callers can reuse this exact cost basis for the
    // quote-decision profit-protection check (lib/quoteDecision.js)
    // without a second, potentially-inconsistent DB round trip, and so
    // Phase 9's dual quote breakdown has a real cost snapshot to draw
    // from.
    cost_engine: {
      cost_cents: cost.breakdown.total_cost_cents,
      minimum_price_cents: cost.breakdown.minimum_price_cents,
      margin_percent: cost.breakdown.margin_percent,
      distance_km: cost.assumptions.total_km,
      truck_selection: cost.truckSelection,
      breakdown: cost.breakdown,
    },
    raw_cost_snapshot: cost,
  };
}

// ============================================================
// INTERNAL COST CALCULATION — for profit optimization.
// Not shown to customer. Used by admin route optimizer.
// ============================================================
export const estimateJobCost = ({ load_size, address_lat, address_lng, quadrant }) => {
  // Rough km estimate from U-Haul depot to customer to dump and back.
  // Without precise geocoding we use quadrant-based estimates.
  const quadrant_km = {
    NE: 15, // U-Haul is in NE, short trip
    NW: 25,
    SE: 30,
    SW: 35,
  };
  const km = quadrant_km[quadrant] || 25;

  // Dump fees by load size (approximate tonnage)
  const dump_fees = {
    single_item: 20,
    quarter: 40,
    half: 80,
    full: 140,
  };

  const truck_cost = UHAUL_DAILY_RATE + km * UHAUL_PER_KM;
  const dump_cost = dump_fees[load_size] || 40;
  const total_cost = truck_cost + dump_cost;

  return {
    truck_cost: Math.round(truck_cost * 100) / 100,
    dump_cost,
    total_cost: Math.round(total_cost * 100) / 100,
    estimated_km: km,
  };
};

// ============================================================
// PROFIT CALCULATION — revenue minus costs
// ============================================================
export const estimateProfit = ({ load_size, total_price, quadrant }) => {
  const costs = estimateJobCost({ load_size, quadrant });
  const profit = total_price - costs.total_cost;
  return {
    ...costs,
    revenue: total_price,
    profit: Math.round(profit * 100) / 100,
    margin: Math.round((profit / total_price) * 1000) / 10, // percentage
  };
};

// ============================================================
// ASYNC COST/PROFIT — uses versioned operating-cost configuration.
// The synchronous versions above remain as deterministic fallbacks.
// ============================================================
const QUADRANT_DISTANCE_KM = {
  NE: 15,
  NW: 25,
  SE: 30,
  SW: 35,
};

export async function estimateJobCostAsync({
  load_size,
  quadrant,
  asOf = new Date().toISOString(),
  // Optional — when provided, truck selection (see
  // lib/costConfig.js's selectTruckFromProfiles) uses the job's real
  // AI-estimated volume/weight instead of the load_size tier's rough
  // representative figures.
  volume_cuft,
  weight_kg,
}) {
  const distanceKm = QUADRANT_DISTANCE_KM[quadrant] || 25;
  const cost = await calculateRouteCost({
    routeType: 'junkhaul_dirty',
    bookings: [{ id: 'est', load_size, total_price: 0, volume_cuft, weight_kg }],
    distanceKm,
    asOf,
  });
  return {
    truck_cost: fromCents(cost.breakdown.rental.total_cents + cost.breakdown.fuel.total_cents),
    dump_cost: fromCents(cost.breakdown.disposal.total_cents),
    total_cost: fromCents(cost.breakdown.total_cost_cents),
    estimated_km: distanceKm,
    breakdown: cost.breakdown,
    truckSelection: cost.truckSelection,
  };
}

export async function estimateProfitAsync({ load_size, total_price, quadrant, asOf, volume_cuft, weight_kg }) {
  const costs = await estimateJobCostAsync({ load_size, quadrant, asOf, volume_cuft, weight_kg });
  const profit = total_price - costs.total_cost;
  return {
    ...costs,
    revenue: total_price,
    profit: roundCurrency(profit, 2),
    margin: total_price ? roundCurrency((profit / total_price) * 100, 1) : 0,
  };
}

// ============================================================
// WEIGHT SAFETY CHECK
// ============================================================
export const checkWeightFlag = (load_size, estimated_weight_kg, pricingConfig = DEFAULT_PRICING) => {
  if (!estimated_weight_kg) return { flag: false };

  const limit = pricingConfig.weight_limits[load_size];
  const warn_threshold = limit * 0.85;

  if (estimated_weight_kg >= limit) {
    return {
      flag: true,
      severity: 'hard',
      reason: `Estimated ${estimated_weight_kg}kg exceeds ${load_size} limit of ${limit}kg for 2 people`,
      action: 'call_customer_before_confirming',
    };
  }

  if (estimated_weight_kg >= warn_threshold) {
    return {
      flag: true,
      severity: 'soft',
      reason: `Estimated ${estimated_weight_kg}kg is near ${load_size} limit of ${limit}kg`,
      action: 'note_in_booking',
    };
  }

  return { flag: false };
};
