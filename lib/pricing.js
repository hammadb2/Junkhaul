// ============================================================
// PRICING ENGINE — runs SERVER-SIDE ONLY. Never expose to client.
// ============================================================
export const PRICING = {
  // Base prices (CAD)
  loads: {
    single_item: 99, // 1-2 large items: couch, mattress, fridge
    quarter: 160, // Few items + boxes, ~1/4 of 15ft truck
    half: 240, // Half a 15ft truck
    full: 380, // Full 15ft truck
  },

  // Add-ons
  same_day: 50,
  stairs_per_flight: 25,
  freon: 40, // Fridge, freezer, AC, water cooler

  // Weight limits in KG for 2 people (Hammad + brother)
  // Flag at 85% of limit, hard stop at 100%
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

  // RULE: early-morning discount to fill hard-to-book 7:30AM slots.
  if (hour === 7) return 0.95; // -5%

  // Standard pricing all other times.
  return 1.0;
};

// ============================================================
// CALCULATE PRICE
// ============================================================
export const calculatePrice = ({
  load_size,
  same_day = false,
  stairs = 0,
  has_freon = false,
  job_date = null,
  job_time = null,
}) => {
  const base = PRICING.loads[load_size];
  if (!base) throw new Error(`Invalid load_size: ${load_size}`);

  const same_day_fee = same_day ? PRICING.same_day : 0;
  const stairs_fee = Math.max(0, stairs) * PRICING.stairs_per_flight;
  const freon_fee = has_freon ? PRICING.freon : 0;

  const multiplier =
    job_date && job_time ? getDynamicMultiplier(job_date, job_time) : 1.0;

  // Apply multiplier to base + add-ons (NOT the same_day fee).
  const subtotal = Math.round((base + stairs_fee + freon_fee) * multiplier);
  const total = subtotal + same_day_fee;
  const balance_due = total - PRICING.deposit;

  return {
    base_price: base,
    same_day_fee,
    stairs_fee,
    freon_fee,
    dynamic_multiplier: multiplier,
    total,
    deposit: PRICING.deposit,
    balance_due,
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
