// ============================================================
// PRICING ENGINE — runs SERVER-SIDE ONLY. Never expose to client.
//
// COST STRUCTURE:
//   U-Haul 15ft truck: $40.99/day + $1.99/km
//   Dump fees: East Calgary Landfill (open Sundays, ~$120/tonne)
//   Labour: 2 people (Hammad + brother)
//
// The customer price factors in truck + dump + labour + profit margin.
// The internal cost calculation is used for profit optimization.
//
// CONFIGURATION:
//   All business constants can be overridden at runtime via the
//   system_config table. The hardcoded values here are the fallback
//   defaults used when a config row is missing.
// ============================================================

import { getNumberConfig } from './config';

// U-Haul pickup location (2615 12 St NE, Calgary)
export const UHAUL_ADDRESS = '2615 12 St NE, Calgary, AB';
export const UHAUL_DAILY_RATE = 40.99;
export const UHAUL_PER_KM = 1.99;

// Calgary landfills
export const LANDFILLS = {
  east_calgary: {
    name: 'East Calgary Landfill',
    address: '3801 68 St SE, Calgary, AB',
    hours: 'Open daily 6:00 AM - 5:00 PM',
    open_sundays: true,
    open_saturday: true,
  },
  spyhill: {
    name: 'Spyhill Landfill',
    address: '11840 69 St NW, Calgary, AB',
    hours: 'Mon-Sat 7:30 AM - 5:00 PM, closed Sundays',
    open_sundays: false,
    open_saturday: true,
  },
  shepard: {
    name: 'Shepard Landfill',
    address: '11411 114 St SE, Calgary, AB',
    hours: 'Mon-Sat 7:30 AM - 5:00 PM, closed Sundays',
    open_sundays: false,
    open_saturday: true,
  },
};

// On Sundays, only East Calgary Landfill is open.
export const getLandfillForDay = (day_type) => {
  if (day_type === 'sunday') return LANDFILLS.east_calgary;
  if (day_type === 'saturday') return LANDFILLS.spyhill; // or shepard
  return LANDFILLS.east_calgary; // weekdays, east calgary is open daily
};

// Hardcoded fallback defaults. These are used when the system_config
// table has no row for the corresponding key.
export const DEFAULT_PRICING = {
  loads: {
    single_item: 99,
    quarter: 160,
    half: 240,
    full: 380,
  },
  same_day: 50,
  stairs_per_flight: 25,
  freon_per_item: 40,
  weight_limits: {
    single_item: 150,
    quarter: 300,
    half: 500,
    full: 700,
  },
  deposit: 50,
  early_bird_hour: 7,
  early_bird_multiplier: 0.95,
  surcharge_min: 0.75,
  surcharge_max: 1.40,
};

export const LOAD_LABELS = {
  single_item: '1-2 items',
  quarter: 'Small load',
  half: 'Half load',
  full: 'Full load',
};

// Backward-compatible export for existing client and server imports.
export const PRICING = DEFAULT_PRICING;

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

// ============================================================
// DYNAMIC PRICING — invisible to customer, single clean price.
// ============================================================
export const getDynamicMultiplier = (job_date, job_time, pricingConfig = DEFAULT_PRICING) => {
  if (!job_date || !job_time) return 1.0;
  const [hourStr] = job_time.split(':');
  const hour = parseInt(hourStr, 10);

  // Early-morning discount to fill hard-to-book 7:30 AM slots.
  if (hour === pricingConfig.early_bird_hour) return pricingConfig.early_bird_multiplier;

  return 1.0;
};

// ============================================================
// CALCULATE PRICE — freon is now per-item
// ============================================================
export const calculatePrice = ({
  load_size,
  same_day = false,
  stairs = 0,
  has_freon = false,
  freon_count = 0,
  job_date = null,
  job_time = null,
  surge_multiplier = 1.0,
  pricingConfig = DEFAULT_PRICING,
}) => {
  const base = pricingConfig.loads[load_size];
  if (!base) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? pricingConfig.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * pricingConfig.stairs_per_flight;

  // Freon: charge per item. If has_freon but no count specified, assume 1.
  const freon_items = has_freon ? Math.max(1, freon_count) : 0;
  const freon_fee = freon_items * pricingConfig.freon_per_item;

  const early_bird_multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time, pricingConfig) : 1.0;

  // Combine the static early-bird rule with the real-time surge
  // multiplier computed from live slot-fill velocity (lib/surge.js).
  // Clamped so no combination of the two can push price outside a
  // sane band regardless of how each is tuned independently.
  const combined = early_bird_multiplier * surge_multiplier;
  const multiplier = Math.max(pricingConfig.surcharge_min, Math.min(pricingConfig.surcharge_max, combined));

  const subtotal = Math.round((base + stairs_fee + freon_fee) * multiplier);
  const total = subtotal + same_day_fee;
  const balance_due = total - pricingConfig.deposit;

  return {
    base_price: base,
    same_day_fee,
    stairs_fee,
    freon_fee,
    freon_count: freon_items,
    early_bird_multiplier,
    surge_multiplier,
    dynamic_multiplier: multiplier,
    total,
    deposit: pricingConfig.deposit,
    balance_due,
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
