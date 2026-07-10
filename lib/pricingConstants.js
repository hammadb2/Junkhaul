// ============================================================
// PRICING CONSTANTS — safe for client-side imports.
// This file has NO Supabase/config imports. It only contains
// pure constants and pure functions.
//
// Client components (admin page, booking page) import from here.
// Server-side code imports from lib/pricing.js which adds the
// async config-loading functions on top of these constants.
// ============================================================

export const UHAUL_ADDRESS = '2615 12 St NE, Calgary, AB';
export const UHAUL_DAILY_RATE = 40.99;
export const UHAUL_PER_KM = 1.99;

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
  pricingConfig = DEFAULT_PRICING,
}) => {
  const base = pricingConfig.loads[load_size];
  if (!base) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? pricingConfig.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * pricingConfig.stairs_per_flight;

  const freon_items = has_freon ? Math.max(1, freon_count) : 0;
  const freon_fee = freon_items * pricingConfig.freon_per_item;

  const early_bird_multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time, pricingConfig) : 1.0;

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
