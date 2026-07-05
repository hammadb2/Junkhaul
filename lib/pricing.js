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
// ============================================================

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

export const PRICING = {
  // Base prices (CAD) — already factor in truck, dump, labour, and profit.
  loads: {
    single_item: 99, // 1-2 large items: couch, mattress, fridge
    quarter: 160, // Few items + boxes, ~1/4 of 15ft truck
    half: 240, // Half a 15ft truck
    full: 380, // Full 15ft truck
  },

  // Add-ons
  same_day: 50,
  stairs_per_flight: 25,
  freon_per_item: 40, // Per freon appliance (fridge, freezer, AC, etc.)

  // Weight limits in KG for 2 people (Hammad + brother)
  weight_limits: {
    single_item: 150,
    quarter: 300,
    half: 500,
    full: 700,
  },

  // Deposit (always $50 regardless of job size)
  deposit: 50,
};

export const LOAD_LABELS = {
  single_item: '1-2 items',
  quarter: 'Small load',
  half: 'Half load',
  full: 'Full load',
};

// ============================================================
// DYNAMIC PRICING — invisible to customer, single clean price.
// ============================================================
export const getDynamicMultiplier = (job_date, job_time) => {
  if (!job_date || !job_time) return 1.0;
  const [hourStr] = job_time.split(':');
  const hour = parseInt(hourStr, 10);

  // Early-morning discount to fill hard-to-book 7:30 AM slots.
  if (hour === 7) return 0.95; // -5%

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
  freon_count = 0, // NEW: number of freon appliances
  job_date = null,
  job_time = null,
}) => {
  const base = PRICING.loads[load_size];
  if (!base) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? PRICING.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * PRICING.stairs_per_flight;

  // Freon: charge per item. If has_freon but no count specified, assume 1.
  const freon_items = has_freon ? Math.max(1, freon_count) : 0;
  const freon_fee = freon_items * PRICING.freon_per_item;

  const multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time) : 1.0;

  const subtotal = Math.round((base + stairs_fee + freon_fee) * multiplier);
  const total = subtotal + same_day_fee;
  const balance_due = total - PRICING.deposit;

  return {
    base_price: base,
    same_day_fee,
    stairs_fee,
    freon_fee,
    freon_count: freon_items,
    dynamic_multiplier: multiplier,
    total,
    deposit: PRICING.deposit,
    balance_due,
  };
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
export const checkWeightFlag = (load_size, estimated_weight_kg) => {
  if (!estimated_weight_kg) return { flag: false };

  const limit = PRICING.weight_limits[load_size];
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
