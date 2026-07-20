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
import { estimateJobCost as estimateJobCostFromConfig } from './costConfig';
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

export async function estimateJobCostAsync({ load_size, quadrant, asOf = new Date().toISOString(), onSiteMinutes = 30 }) {
  const distanceKm = QUADRANT_DISTANCE_KM[quadrant] || 25;
  const estimate = await estimateJobCostFromConfig({
    loadSize: load_size,
    distanceKm,
    onSiteMinutes,
    asOf,
  });
  return {
    truck_cost: roundCurrency(estimate.breakdown.rental + estimate.breakdown.fuel, 2),
    dump_cost: estimate.breakdown.facility,
    total_cost: estimate.cost,
    estimated_km: distanceKm,
    breakdown: estimate.breakdown,
  };
}

export async function estimateProfitAsync({ load_size, total_price, quadrant, asOf, onSiteMinutes = 30 }) {
  const costs = await estimateJobCostAsync({ load_size, quadrant, asOf, onSiteMinutes });
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
