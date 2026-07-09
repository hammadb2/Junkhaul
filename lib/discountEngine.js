// ============================================================
// DISCOUNT ENGINE — capacity-aware discount curve for the
// opportunistic load algorithm (Growth Engine Section 4.4).
//
// The discount scales with three variables the app already has:
//   1. How full the truck already is (fill %)
//   2. How much detour the pickup requires (km)
//   3. How close to end-of-day it is (hour of day)
//
// The floor rule: never discount below the marginal cost of taking
// the load (dump fee share + a few minutes of crew time). The
// existing estimateJobCost()/estimateProfit() functions in
// lib/pricing.js provide the cost basis.
//
// CONFIGURATION: all constants are read from system_config with
// hardcoded fallback defaults.
// ============================================================

import { PRICING, estimateJobCost, UHAUL_PER_KM } from './pricing';
import { getNumberConfig } from './config';

// Truck capacity in kg (15ft U-Haul, full load)
const TRUCK_CAPACITY_KG = 700;

// Load-size weight equivalents (from PRICING.weight_limits)
const LOAD_WEIGHTS = PRICING.weight_limits;

const loadDiscountConfig = async () => {
  return {
    fillFactorMax: await getNumberConfig('discount_fill_factor_max', 25),
    detourPenaltyPerKm: await getNumberConfig('discount_detour_penalty_per_km', 1.0),
    lateDayStartHour: await getNumberConfig('discount_late_day_start_hour', 15),
    lateDayBonusPerHour: await getNumberConfig('discount_late_day_bonus_per_hour', 2.5),
    slowDayThreshold: await getNumberConfig('discount_slow_day_threshold', 3),
    slowDayBonus: await getNumberConfig('discount_slow_day_bonus', 5),
    verySlowDayThreshold: await getNumberConfig('discount_very_slow_day_threshold', 2),
    verySlowDayBonus: await getNumberConfig('discount_very_slow_day_bonus', 3),
    maxPct: await getNumberConfig('discount_max_pct', 40),
    floorMinPct: await getNumberConfig('discount_floor_min_pct', 60),
  };
};

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
// ============================================================
export const computeDiscount = async ({
  fillPct,
  detourKm,
  hourOfDay,
  bookingsToday = 0,
}) => {
  const cfg = await loadDiscountConfig();
  let discount = 0;

  // Fill factor: empty truck → up to fillFactorMax off; nearly full → 0
  const fillFactor = (1 - fillPct) * cfg.fillFactorMax;
  discount += fillFactor;

  // Detour factor: 0km detour → no penalty; 10km+ → -10% discount
  const detourPenalty = Math.min(10, detourKm * cfg.detourPenaltyPerKm);
  discount -= detourPenalty;

  // Time-of-day factor: lateDayStartHour+ → up to +10% extra discount
  if (hourOfDay >= cfg.lateDayStartHour) {
    discount += Math.min(10, (hourOfDay - cfg.lateDayStartHour) * cfg.lateDayBonusPerHour);
  }

  // Slow-day factor
  if (bookingsToday < cfg.slowDayThreshold) {
    discount += cfg.slowDayBonus;
  }
  if (bookingsToday < cfg.verySlowDayThreshold) {
    discount += cfg.verySlowDayBonus;
  }

  // Clamp to reasonable range
  discount = Math.max(0, Math.min(cfg.maxPct, Math.round(discount)));

  return discount;
};

// ============================================================
// computeDiscountedPrice — apply discount, enforce floor
// ============================================================
export const computeDiscountedPrice = async ({
  originalPrice,
  load_size,
  quadrant,
  detourKm,
  fillPct,
  hourOfDay,
  bookingsToday,
}) => {
  const cfg = await loadDiscountConfig();
  const discountPct = await computeDiscount({
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
  const detourFuelCost = detourKm * UHAUL_PER_KM;
  const floor = costs.dump_cost + detourFuelCost + 10;

  if (discountedPrice < floor) {
    discountedPrice = Math.ceil(floor);
  }

  // Never discount below floorMinPct of original (sanity check)
  const hardFloor = Math.round(originalPrice * (cfg.floorMinPct / 100));
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
// ============================================================
export const rankLeads = async ({ leads, crewLat, crewLng, computeDiscountForLead }) => {
  const scored = [];
  for (const lead of leads) {
    const detourKm = haversineKm(crewLat, crewLng, lead.lat, lead.lng);
    const discount = await computeDiscountForLead(lead, detourKm);
    const detourCost = detourKm * UHAUL_PER_KM;
    const score = (lead.ai_price_estimate || 100) - detourCost - discount.savings;

    scored.push({
      ...lead,
      detourKm,
      discount,
      profitabilityScore: score,
    });
  }

  scored.sort((a, b) => b.profitabilityScore - a.profitabilityScore);
  return scored;
};

// Haversine in km (same as crew/nearby-opportunities)
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};
