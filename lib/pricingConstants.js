// ============================================================
// PRICING CONSTANTS — safe for client-side imports.
// This file has NO Supabase/config imports. It only contains
// pure constants and pure functions.
//
// Client components (admin page, booking page) import from here.
// Server-side code imports from lib/pricing.js which adds the
// async config-loading functions on top of these constants.
// ============================================================

export const UHAUL_ADDRESS = '100 Main Street, Balzac, AB T0M 0E0';
export const UHAUL_DAILY_RATE = 40.99;
export const UHAUL_PER_KM = 1.99;

// ============================================================
// CUSTOMER-FACING TRAVEL FEE — separate from internal cost.
// Charged at $1.50/km for: home → U-Haul pickup → customer.
// Pickup point: Gas Plus, 100 Main Street, Balzac, AB.
// ============================================================
export const TRAVEL_FEE_PER_KM = 1.50;
export const TRAVEL_FEE_PICKUP = {
  address: '100 Main Street, Balzac, AB T0M 0E0',
  lat: 51.2128,
  lng: -114.0081,
};
// Our home/depot starting point (leg 1 origin).
export const TRAVEL_FEE_HOME = {
  address: '100 Main Street, Balzac, AB T0M 0E0',
  lat: 51.2128,
  lng: -114.0081,
};

// ============================================================
// TRUCK SIZE UPSELL — flat fee on top of load price.
// 15ft = default (included), 20ft = +$150, 26ft = +$300.
// ============================================================
export const TRUCK_SIZES = {
  15: { label: '15ft', volume_cuft: 764, max_load_lbs: 6385, fee: 0 },
  20: { label: '20ft', volume_cuft: 1016, max_load_lbs: 5700, fee: 150 },
  26: { label: '26ft', volume_cuft: 1682, max_load_lbs: 12859, fee: 300 },
};

// AI weight-estimate thresholds (in lbs) for truck size trigger.
// NOTE: 20ft carries LESS weight than 15ft (heavier truck body).
// Trigger primarily on weight, not just volume.
export const TRUCK_SIZE_WEIGHT_THRESHOLDS = {
  recommend_20ft_lbs: 6000,   // approaching 15ft max load
  recommend_26ft_lbs: 10000,  // heavy loads need the 26ft
};

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

export const getLandfillForDay = (day_type) => {
  if (day_type === 'sunday') return LANDFILLS.east_calgary;
  if (day_type === 'saturday') return LANDFILLS.spyhill;
  return LANDFILLS.east_calgary;
};

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

export const PRICING = DEFAULT_PRICING;

export const getDynamicMultiplier = (job_date, job_time, pricingConfig = DEFAULT_PRICING) => {
  if (!job_date || !job_time) return 1.0;
  const [hourStr] = job_time.split(':');
  const hour = parseInt(hourStr, 10);
  if (hour === pricingConfig.early_bird_hour) return pricingConfig.early_bird_multiplier;
  return 1.0;
};

export const calculatePrice = ({
  load_size,
  same_day = false,
  stairs = 0,
  has_freon = false,
  freon_count = 0,
  job_date = null,
  job_time = null,
  surge_multiplier = 1.0,
  travel_fee = 0,
  truck_size = 15,
  pricingConfig = DEFAULT_PRICING,
}) => {
  const base = pricingConfig.loads[load_size];
  if (!base) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? pricingConfig.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * pricingConfig.stairs_per_flight;

  const freon_items = has_freon ? Math.max(1, freon_count) : 0;
  const freon_fee = freon_items * pricingConfig.freon_per_item;

  // Truck size upsell fee (0 for 15ft, 150 for 20ft, 300 for 26ft)
  const truck_fee = TRUCK_SIZES[truck_size]?.fee || 0;

  const early_bird_multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time, pricingConfig) : 1.0;

  const combined = early_bird_multiplier * surge_multiplier;
  const multiplier = Math.max(pricingConfig.surcharge_min, Math.min(pricingConfig.surcharge_max, combined));

  // Travel fee and truck fee are not multiplied by surge/early-bird —
  // they're flat pass-through costs.
  const subtotal = Math.round((base + stairs_fee + freon_fee) * multiplier);
  const total = subtotal + same_day_fee + travel_fee + truck_fee;
  const balance_due = total - pricingConfig.deposit;

  return {
    base_price: base,
    same_day_fee,
    stairs_fee,
    freon_fee,
    freon_count: freon_items,
    travel_fee,
    truck_size,
    truck_fee,
    early_bird_multiplier,
    surge_multiplier,
    dynamic_multiplier: multiplier,
    total,
    deposit: pricingConfig.deposit,
    balance_due,
  };
};
