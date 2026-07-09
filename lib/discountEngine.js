// ============================================================
// DISCOUNT ENGINE — capacity-aware discount curve for the
// opportunistic load algorithm (Growth Engine Section 4.4).
//
// The discount scales with three variables the app already has:
//   1. How full the truck already is (fill %)
//   2. How much detour the pickup requires (km)
//   3. How close to end-of-day it is (hour of day)
//
// The floor rule: never discount below marginal cost (dump fee
// share + a few minutes of crew time). The existing
// estimateJobCost() in lib/pricing.js provides the cost basis.
// ============================================================

import { PRICING, estimateJobCost, UHAUL_PER_KM } from './pricing';

// Truck capacity in kg (15ft U-Haul, full load)
export const TRUCK_CAPACITY_KG = 700;

// Load-size weight equivalents (from PRICING.weight_limits)
const LOAD_WEIGHTS = PRICING.weight_limits;

// ============================================================
// computeTruckFill — what % of the truck is full right now?
// ============================================================
export const computeTruckFill = (completedJobs) => {
  let totalKg = 0;
  for (const job of completedJobs) {
    // Use AI weight estimate if available, otherwise use load_size limit
    const kg = job.ai_weight_estimate_kg || LOAD_WEIGHTS[job.load_size] || 0;
    totalKg += kg;
  }
  const fillPct = Math.min(1, totalKg / TRUCK_CAPACITY_KG);
  return {
    fillPct,
    totalKg,
    remainingKg: Math.max(0, TRUCK_CAPACITY_KG - totalKg),
  };
};

// ============================================================
// remainingLoadSlots — how many load-size equivalents fit?
// ============================================================
export const remainingLoadSlots = (remainingKg) => {
  const slots = {};
  for (const [size, limit] of Object.entries(LOAD_WEIGHTS)) {
    slots[size] = Math.floor(remainingKg / limit);
  }
  return slots;
};

// ============================================================
// computeDiscount — the discount curve
//
// Returns a discount percentage (0-40) based on:
//   - fillPct: higher fill = smaller discount (truck nearly full,
//     less room, less need to discount)
//   - detourKm: more detour = smaller discount (more cost to reach)
//   - hourOfDay: later in day = bigger discount (less chance of
//     a full-price booking filling naturally)
//   - bookingsToday: fewer bookings = bigger discount (slow day,
//     need to stimulate demand)
//
// The curve is deliberately simple and defensible. It can be
// tuned later without changing the calling code.
// ============================================================
export const computeDiscount = ({
  fillPct,
  detourKm,
  hourOfDay,
  bookingsToday = 0,
}) => {
  let discount = 0;

  // Fill factor: empty truck → up to 25% off; nearly full → 5% off
  // The emptier the truck, the more we need to fill it
  const fillFactor = (1 - fillPct) * 25; // 0-25
  discount += fillFactor;

  // Detour factor: 0km detour → no penalty; 10km+ → -10% discount
  // More detour = more cost = less room to discount
  const detourPenalty = Math.min(10, detourKm * 1.0); // 0-10
  discount -= detourPenalty;

  // Time-of-day factor: 3pm+ → up to +10% extra discount
  // Late in the day with no more scheduled stops = take what you can
  if (hourOfDay >= 15) {
    discount += Math.min(10, (hourOfDay - 15) * 2.5); // 3pm→+0, 7pm→+10
  }

  // Slow-day factor: fewer than 3 bookings today → +5% extra
  if (bookingsToday < 3) {
    discount += 5;
  }
  if (bookingsToday < 2) {
    discount += 3; // additional +3 for very slow days
  }

  // Clamp to reasonable range
  discount = Math.max(0, Math.min(40, Math.round(discount)));

  return discount;
};

// ============================================================
// computeDiscountedPrice — apply discount, enforce floor
//
// The floor: never go below marginal cost (dump fee + small
// crew time allowance). Uses estimateJobCost from lib/pricing.
// ============================================================
export const computeDiscountedPrice = ({
  originalPrice,
  load_size,
  quadrant,
  detourKm,
  fillPct,
  hourOfDay,
  bookingsToday,
}) => {
  const discountPct = computeDiscount({
    fillPct,
    detourKm,
    hourOfDay,
    bookingsToday,
  });

  let discountedPrice = Math.round(
    originalPrice * (1 - discountPct / 100)
  );

  // Enforce floor: marginal cost of taking the load
  const costs = estimateJobCost({
    load_size,
    quadrant,
  });
  // Floor = dump cost + detour fuel cost + $10 crew time allowance
  const detourFuelCost = detourKm * UHAUL_PER_KM;
  const floor = costs.dump_cost + detourFuelCost + 10;

  if (discountedPrice < floor) {
    discountedPrice = Math.ceil(floor);
  }

  // Never discount below 60% of original (sanity check)
  const hardFloor = Math.round(originalPrice * 0.6);
  if (discountedPrice < hardFloor) {
    discountedPrice = hardFloor;
  }

  const actualDiscountPct = Math.round(
    ((originalPrice - discountedPrice) / originalPrice) * 100
  );

  return {
    originalPrice,
    discountedPrice,
    discountPct: actualDiscountPct,
    floor,
    savings: originalPrice - discountedPrice,
  };
};

// ============================================================
// rankLeads — rank quoted-but-unbooked leads by profitability
//
// Score = expected job value - detour cost - discount amount
// Higher score = more profitable to pursue first.
// ============================================================
export const rankLeads = ({ leads, crewLat, crewLng, computeDiscountForLead }) => {
  const scored = leads.map((lead) => {
    const detourKm = haversineKm(crewLat, crewLng, lead.lat, lead.lng);
    const discount = computeDiscountForLead(lead, detourKm);
    const detourCost = detourKm * UHAUL_PER_KM;
    const score = (lead.ai_price_estimate || 100) - detourCost - discount.savings;

    return {
      ...lead,
      detourKm,
      discount,
      profitabilityScore: score,
    };
  });

  scored.sort((a, b) => b.profitabilityScore - a.profitabilityScore);
  return scored;
};

// Haversine in km (same as crew/nearby-opportunities)
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};
