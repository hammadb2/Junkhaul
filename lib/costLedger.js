// ============================================================
// COST LEDGER — canonical route/job cost calculation.
//
// This is the single service all quoting, dispatch, reporting,
// Rehaul delivery, and reconciliation should call for cost numbers.
//
// All returned money is in integer cents. All persisted money is in
// integer cents. Floating point is used only for physical quantities
// (km, litres, kg, hours) and is rounded before conversion to cents.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import {
  getCostConfig,
  getActiveVehicleProfiles,
  selectTruckFromProfiles,
  computeRentalCost,
  computeFuelCost,
  computeLaborCost,
  computeFacilityCost,
  computeOverheadAllocation,
  quotePriceFromCost,
} from './costConfig.js';
import {
  toCents,
  fromCents,
  sumCents,
  multiplyCents,
  divideCents,
  percentageOfCents,
  roundCents,
  centsToDollarsString,
} from './money.js';
import { kmToMiles, roundCurrency } from './unitConversions.js';

// Business constants
const DEPOT = { lat: 51.2128, lng: -114.0081 }; // Gas Plus Balzac, AB
const DEFAULT_LANDFILL = { lat: 51.0379, lng: -113.9829 }; // East Calgary Landfill
const AVERAGE_SPEED_KMH = 50;

const LOAD_ONSITE_MINUTES = {
  single_item: 20,
  quarter: 40,
  half: 60,
  full: 90,
};

const LOAD_WEIGHT_KG = {
  single_item: 50,
  quarter: 150,
  half: 350,
  full: 700,
};

// Representative cubic-foot volume per load-size tier, matching the same
// tiers used by the photo-quote estimator (app/api/photo-quote/route.js's
// TIERS). Used only when a booking doesn't carry its own estimated_volume_cuft.
const LOAD_VOLUME_CUFT = {
  single_item: 15,
  quarter: 45,
  half: 95,
  full: 160,
};

function volumeCuftForBooking(b) {
  return Number(b.volume_cuft ?? LOAD_VOLUME_CUFT[b.load_size] ?? 0);
}

// Haversine distance in kilometres (fallback when real routed km unavailable).
function haversineKm(a, b) {
  const dLat = (b.lat - a.lat) * 111;
  const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function hasValidCoords(p) {
  return typeof p?.lat === 'number' && typeof p?.lng === 'number';
}

function buildStops({ routeType, bookings, landfill = DEFAULT_LANDFILL, onSiteMinutesByLoadSize = LOAD_ONSITE_MINUTES }) {
  const stops = [
    { purpose: 'depot_start', lat: DEPOT.lat, lng: DEPOT.lng, address: 'Gas Plus Balzac, AB' },
  ];
  for (const b of bookings) {
    stops.push({
      purpose: 'customer',
      booking_id: b.id,
      lat: b.lat,
      lng: b.lng,
      address: b.address,
      load_size: b.load_size,
      on_site_minutes: b.on_site_minutes ?? onSiteMinutesByLoadSize[b.load_size] ?? 30,
      // Stairs are a calculated labor-time cost, not a flat fee — see
      // computeStopServiceMinutes, which adds real minutes per flight.
      stairs: Math.max(0, Number(b.stairs || 0)),
      // Extra crew minutes for ultra-heavy-but-still-accepted items
      // (100-200kg — dolly/ramp/extra care), already computed upstream
      // by lib/itemPricing.js's checkItemEligibility — Pricing Engine
      // Phase 6. Added straight through, not re-scaled here.
      heavy_item_minutes: Math.max(0, Number(b.heavy_item_minutes || 0)),
      weight_kg: b.weight_kg ?? LOAD_WEIGHT_KG[b.load_size] ?? 0,
      waste_stream: b.waste_stream ?? 'general_junk',
    });
  }
  if (routeType === 'junkhaul_dirty') {
    stops.push({ purpose: 'landfill', lat: landfill.lat, lng: landfill.lng, address: 'East Calgary Landfill' });
  }
  stops.push({ purpose: 'depot_end', lat: DEPOT.lat, lng: DEPOT.lng, address: 'Gas Plus Balzac, AB' });
  return stops;
}

function computeRouteDistance(stops) {
  let km = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (hasValidCoords(a) && hasValidCoords(b)) {
      const leg = haversineKm(a, b);
      km += leg;
      stops[i].distance_from_previous_km = leg;
    } else {
      stops[i].distance_from_previous_km = 0;
    }
  }
  return { km: roundCurrency(km, 4), stops };
}

// Extra crew minutes for carrying items up/down stairs — a calculated
// labor-time cost (not a flat fee), scaled by the admin-configurable
// labor_rate_versions.stairs_minutes_per_flight.
function accessDifficultyMinutes(stairs, laborRate) {
  return Math.max(0, Number(stairs || 0)) * Number(laborRate?.stairs_minutes_per_flight ?? 8);
}

function computeStopServiceMinutes(stops, laborRate) {
  for (const s of stops) {
    if (s.purpose === 'customer') {
      s.access_difficulty_minutes = accessDifficultyMinutes(s.stairs, laborRate) + Math.max(0, Number(s.heavy_item_minutes || 0));
      s.service_minutes = (s.on_site_minutes ?? 30) + s.access_difficulty_minutes;
    } else if (s.purpose === 'landfill') {
      s.service_minutes = 20;
    } else {
      s.service_minutes = 0;
    }
  }
}

function totalServiceMinutes(stops) {
  return stops.reduce((sum, s) => sum + (s.service_minutes || 0), 0);
}

function travelMinutes(distanceKm) {
  return (distanceKm / AVERAGE_SPEED_KMH) * 60;
}

function totalRouteMinutes(stops, distanceKm) {
  return travelMinutes(distanceKm) + totalServiceMinutes(stops);
}

function rentalDaysForMinutes(minutes) {
  return Math.max(1, Math.ceil(minutes / (24 * 60)));
}

function weightKgForBooking(b) {
  return Number(b.weight_kg ?? LOAD_WEIGHT_KG[b.load_size] ?? 0);
}

// ============================================================
// Pure cost calculation
// ============================================================

export async function calculateRouteCost({
  routeType = 'junkhaul_dirty',
  bookings = [],
  asOf = new Date().toISOString(),
  distanceKm,
  durationMinutes,
  people = 2,
  onSiteMinutesByLoadSize = LOAD_ONSITE_MINUTES,
  averageSpeedKmh = AVERAGE_SPEED_KMH,
  jobsPerMonth = 100,
  revenueCents,
  facility = 'East Calgary Landfill',
  wasteStream = 'general_junk',
  client = supabaseAdmin,
  costConfig,
} = {}) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    throw new Error('At least one booking is required to calculate route cost');
  }
  if (bookings.some((b) => !b.load_size)) {
    throw new Error('Every booking must have a load_size');
  }

  // Select the smallest of the 15/20/26ft trucks that safely covers this
  // route's TOTAL estimated weight and volume (not just one booking) —
  // skipped when a pre-resolved costConfig was explicitly passed in,
  // since that caller already chose a vehicle on purpose.
  let truckSelection = null;
  let cfg = costConfig;
  if (!cfg) {
    const totalWeightKg = bookings.reduce((s, b) => s + weightKgForBooking(b), 0);
    const totalVolumeCuft = bookings.reduce((s, b) => s + volumeCuftForBooking(b), 0);
    const profiles = await getActiveVehicleProfiles(client);
    truckSelection = selectTruckFromProfiles(profiles, { volumeCuft: totalVolumeCuft, weightKg: totalWeightKg });
    const vehicleClass = truckSelection.profile?.vehicle_class;
    const vehicleProfileId = truckSelection.profile?.id;
    cfg = await getCostConfig({ asOf, facility, wasteStream, vehicleClass, vehicleProfileId, client });
  }
  if (!cfg.rental || !cfg.fuel || !cfg.labor || !cfg.facility || !cfg.overhead || !cfg.policy) {
    throw new Error('Missing required cost configuration for route cost');
  }

  const stops = buildStops({ routeType, bookings, onSiteMinutesByLoadSize });
  computeStopServiceMinutes(stops, cfg.labor);
  const { km, stops: stopsWithKm } = computeRouteDistance(stops);
  const totalAccessDifficultyMinutes = stops.reduce((s, st) => s + (st.access_difficulty_minutes || 0), 0);
  const totalKm = distanceKm ?? km;

  const serviceMinutes = totalServiceMinutes(stopsWithKm);
  const totalMinutes = durationMinutes ?? totalRouteMinutes(stopsWithKm, totalKm);
  const hours = totalMinutes / 60;
  const days = rentalDaysForMinutes(totalMinutes);

  // Rental
  const rentalDollars = computeRentalCost({
    rentalRate: cfg.rental,
    distanceKm: totalKm,
    days,
    includedKm: cfg.rental.included_km ?? 0,
  });
  const rentalBaseDollars = Number(cfg.rental.daily_rate) * days;
  const rentalMileageDollars = rentalDollars - rentalBaseDollars;

  // Fuel
  const fuelDollars = computeFuelCost({
    fuelRate: cfg.fuel,
    distanceKm: totalKm,
    vehicleFuelBaselineLPer100km: cfg.vehicle?.fuel_baseline_l_per_100km,
  });

  // Labor
  const laborDollars = computeLaborCost({ laborRate: cfg.labor, hours, people });

  // Disposal (only for dirty routes) — real weight-based landfill billing
  // (per-tonne rate, floored at the facility's flat minimum), not a flat
  // per-load-size guess. See lib/costConfig.js's computeFacilityCost.
  const totalWeightKgForDisposal = bookings.reduce((s, b) => s + weightKgForBooking(b), 0);
  const disposalDollars = routeType === 'junkhaul_dirty'
    ? computeFacilityCost({ facilityRate: cfg.facility, loadSize: bookings[0]?.load_size, weightKg: totalWeightKgForDisposal })
    : 0;

  // Overhead — computed in integer cents to avoid floating-point drift.
  const totalRevenueCents = revenueCents ?? 0;
  const paymentFeeCents = percentageOfCents(totalRevenueCents, Number(cfg.overhead.payment_fees_percent || 0));
  const suppliesCents = toCents(Number(cfg.overhead.supplies_per_job || 0));
  const insuranceCents = toCents(Number(cfg.overhead.insurance_allocation_per_day || 0) * days);
  const softwareCents = toCents(Number(cfg.overhead.software_per_month || 0) / jobsPerMonth);
  const adminCents = toCents(Number(cfg.overhead.admin_per_month || 0) / jobsPerMonth);
  const contingencyCents = percentageOfCents(totalRevenueCents, Number(cfg.overhead.contingency_percent || 0));
  const riskReserveCents = percentageOfCents(totalRevenueCents, Number(cfg.overhead.risk_reserve_percent || 0));
  const overheadCents = paymentFeeCents + suppliesCents + insuranceCents + softwareCents + adminCents + contingencyCents + riskReserveCents;

  const rentalCents = toCents(rentalDollars);
  const fuelCents = toCents(fuelDollars);
  const laborCents = toCents(laborDollars);
  const disposalCents = toCents(disposalDollars);
  const totalCostCents = rentalCents + fuelCents + laborCents + disposalCents + overheadCents;

  const minimumPriceDollars = quotePriceFromCost({ cost: fromCents(totalCostCents), pricingPolicy: cfg.policy });
  const proposedPriceCents = revenueCents ?? toCents(minimumPriceDollars);
  const contributionCents = proposedPriceCents - totalCostCents;
  const marginPercent = proposedPriceCents ? (contributionCents / proposedPriceCents) * 100 : 0;

  const sourceVersions = {
    vehicle_profile_id: cfg.vehicle?.id ?? null,
    rental_rate_version_id: cfg.rental.id ?? null,
    fuel_rate_version_id: cfg.fuel.id ?? null,
    labor_rate_version_id: cfg.labor.id ?? null,
    facility_rate_version_id: cfg.facility.id ?? null,
    overhead_rate_version_id: cfg.overhead.id ?? null,
    pricing_policy_version_id: cfg.policy.id ?? null,
    as_of: asOf,
  };

  const assumptions = {
    route_type: routeType,
    people,
    average_speed_kmh: averageSpeedKmh,
    jobs_per_month: jobsPerMonth,
    total_km: totalKm,
    total_minutes: totalMinutes,
    service_minutes: serviceMinutes,
    // Extra crew minutes already folded into service_minutes/hours above
    // for carrying items up/down stairs — see computeStopServiceMinutes.
    // Broken out here so callers can show "why" the labor cost is what
    // it is, without re-deriving it.
    access_difficulty_minutes: totalAccessDifficultyMinutes,
    rental_days: days,
    facility,
    waste_stream: wasteStream,
  };

  const decision =
    contributionCents < 0 ? 'reject' :
    contributionCents < riskReserveCents ? 'review' :
    'accept';

  const breakdown = {
    rental: {
      days,
      base_rental_cents: toCents(rentalBaseDollars),
      mileage_km: totalKm,
      mileage_charge_cents: toCents(rentalMileageDollars),
      total_cents: rentalCents,
    },
    fuel: {
      litres: roundCurrency((totalKm * cfg.fuel.quote_safety_l_per_100km) / 100, 4),
      cost_per_litre_cents: toCents(cfg.fuel.price_per_litre),
      total_cents: fuelCents,
    },
    labor: {
      hours: roundCurrency(hours, 4),
      people,
      hourly_rate_cents: toCents(cfg.labor.hourly_rate),
      burden_percent: Number(cfg.labor.burden_percent || 0),
      total_cents: laborCents,
    },
    disposal: {
      facility,
      waste_stream: routeType === 'junkhaul_dirty' ? wasteStream : null,
      predicted_weight_kg: totalWeightKgForDisposal,
      per_tonne_rate_cents: toCents(cfg.facility.per_tonne_rate || 0),
      flat_minimum_cents: toCents(cfg.facility.flat_minimum),
      total_cents: disposalCents,
    },
    overhead: {
      payment_fee_cents: paymentFeeCents,
      supplies_cents: suppliesCents,
      insurance_cents: insuranceCents,
      software_cents: softwareCents,
      admin_cents: adminCents,
      contingency_cents: contingencyCents,
      risk_reserve_cents: riskReserveCents,
      total_cents: overheadCents,
    },
    total_cost_cents: totalCostCents,
    minimum_price_cents: toCents(minimumPriceDollars),
    proposed_price_cents: proposedPriceCents,
    contribution_cents: contributionCents,
    margin_percent: roundCurrency(marginPercent, 4),
    decision,
  };

  return {
    routeType,
    bookings: bookings.map((b) => ({ id: b.id, load_size: b.load_size, total_price: b.total_price })),
    stops: stopsWithKm.map((s) => ({
      purpose: s.purpose,
      booking_id: s.booking_id ?? null,
      lat: s.lat,
      lng: s.lng,
      address: s.address,
      distance_from_previous_km: s.distance_from_previous_km,
      service_minutes: s.service_minutes,
    })),
    cfg,
    sourceVersions,
    assumptions,
    breakdown,
    rateVersionIds: sourceVersions,
    truckSelection,
  };
}

// ============================================================
// Allocation across bookings
// ============================================================

export function allocateRouteCost(costResult, method = 'hybrid') {
  const { breakdown, bookings, stops } = costResult;
  const allocations = [];
  const perBooking = Object.fromEntries(bookings.map((b) => [b.id, []]));

  const add = (category, amountCents, allocator) => {
    if (amountCents <= 0) return;
    const shares = allocator(amountCents);
    for (const [bookingId, cents] of Object.entries(shares)) {
      perBooking[bookingId].push({ category, allocated_amount_cents: cents });
      allocations.push({ booking_id: bookingId, category, allocated_amount_cents: cents });
    }
  };

  const customerStops = stops.filter((s) => s.purpose === 'customer');
  const totalKm = customerStops.reduce((s, st) => s + (st.distance_from_previous_km || 0), 0);
  const totalServiceMinutes = customerStops.reduce((s, st) => s + (st.service_minutes || 0), 0);
  const totalWeight = bookings.reduce((s, b) => s + weightKgForBooking(b), 0);
  const totalRevenue = bookings.reduce((s, b) => s + (Number(b.total_price) || 0), 0);

  const byKm = (amountCents) => {
    if (totalKm <= 0) return equal(amountCents);
    return allocateProportional(
      amountCents,
      customerStops.map((s) => ({ id: s.booking_id, weight: s.distance_from_previous_km || 0 }))
    );
  };

  const byTime = (amountCents) => {
    if (totalServiceMinutes <= 0) return equal(amountCents);
    return allocateProportional(
      amountCents,
      customerStops.map((s) => ({ id: s.booking_id, weight: (s.service_minutes || 0) + (s.distance_from_previous_km || 0) * (60 / AVERAGE_SPEED_KMH) }))
    );
  };

  const byWeight = (amountCents) => {
    if (totalWeight <= 0) return equal(amountCents);
    return allocateProportional(
      amountCents,
      bookings.map((b) => ({ id: b.id, weight: weightKgForBooking(b) }))
    );
  };

  const byRevenue = (amountCents) => {
    if (totalRevenue <= 0) return equal(amountCents);
    return allocateProportional(
      amountCents,
      bookings.map((b) => ({ id: b.id, weight: Number(b.total_price) || 0 }))
    );
  };

  const equal = (amountCents) => {
    return allocateProportional(
      amountCents,
      bookings.map((b) => ({ id: b.id, weight: 1 }))
    );
  };

  const hybrid = (amountCents) => {
    // For mixed fixed/variable costs use time for labor and km for mileage/fuel.
    return byTime(amountCents);
  };

  // Rental base: only split among committed bookings; single-booking fallback = full amount to that booking.
  add('rental_base', breakdown.rental.base_rental_cents, bookings.length === 1 ? (c) => ({ [bookings[0].id]: c }) : equal);

  // Rental mileage and fuel: by km.
  add('rental_mileage', breakdown.rental.mileage_charge_cents, byKm);
  add('fuel', breakdown.fuel.total_cents, byKm);

  // Labor: by time (service + travel).
  add('labor_wages', breakdown.labor.total_cents, byTime);

  // Disposal: by weight.
  add('disposal_flat', breakdown.disposal.total_cents, byWeight);

  // Overhead: payment fee by revenue; supplies equal; insurance by day/time; software/admin by revenue; contingency/risk by revenue.
  add('payment_fee', breakdown.overhead.payment_fee_cents, byRevenue);
  add('supplies', breakdown.overhead.supplies_cents, equal);
  add('insurance', breakdown.overhead.insurance_cents, byTime);
  add('software', breakdown.overhead.software_cents, byRevenue);
  add('admin', breakdown.overhead.admin_cents, byRevenue);
  add('contingency', breakdown.overhead.contingency_cents, byRevenue);
  add('risk_reserve', breakdown.overhead.risk_reserve_cents, byRevenue);

  return {
    total_cost_cents: breakdown.total_cost_cents,
    by_booking: perBooking,
    allocations,
  };
}

function allocateProportional(totalCents, weightedItems) {
  const weights = weightedItems.map((i) => Number(i.weight) || 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    // Equal fallback.
    return equalSplit(totalCents, weightedItems.map((i) => i.id));
  }

  const out = {};
  let allocated = 0;
  for (let i = 0; i < weightedItems.length; i++) {
    const item = weightedItems[i];
    const isLast = i === weightedItems.length - 1;
    if (isLast) {
      out[item.id] = totalCents - allocated;
    } else {
      const cents = Math.floor((totalCents * weights[i]) / totalWeight);
      out[item.id] = cents;
      allocated += cents;
    }
  }
  return out;
}

function equalSplit(totalCents, ids) {
  const base = Math.floor(totalCents / ids.length);
  const remainder = totalCents - base * ids.length;
  const out = {};
  ids.forEach((id, i) => {
    out[id] = base + (i < remainder ? 1 : 0);
  });
  return out;
}

// ============================================================
// Route run persistence
// ============================================================

export async function createRouteRun({
  routePlanId,
  crewAssignmentId,
  routeType,
  vehicleProfileId,
  driverEmployeeId,
  secondaryEmployeeId,
  plannedStartAt,
  plannedDistanceKm,
  plannedDurationMinutes,
  sourceVersions,
  client = supabaseAdmin,
}) {
  const { data, error } = await client
    .from('route_runs')
    .insert({
      route_plan_id: routePlanId,
      crew_assignment_id: crewAssignmentId,
      route_type: routeType,
      vehicle_profile_id: vehicleProfileId,
      driver_employee_id: driverEmployeeId,
      secondary_employee_id: secondaryEmployeeId,
      planned_start_at: plannedStartAt,
      planned_distance_km: plannedDistanceKm,
      planned_duration_minutes: plannedDurationMinutes,
      source_versions: sourceVersions || {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createRouteStops({ routeRunId, stops, client = supabaseAdmin }) {
  const rows = stops.map((s, idx) => ({
    route_run_id: routeRunId,
    sequence: idx,
    purpose: s.purpose,
    booking_id: s.booking_id || null,
    address_snapshot: s.address,
    lat: s.lat,
    lng: s.lng,
    planned_duration_minutes: s.service_minutes || 0,
    planned_distance_from_previous_km: s.distance_from_previous_km || 0,
    status: 'planned',
  }));

  const { data, error } = await client.from('route_stops').insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function persistCostLedger({
  routeRunId,
  costResult,
  phase = 'estimated',
  createdBy = null,
  persistAllocations = true,
  client = supabaseAdmin,
}) {
  const { breakdown, bookings, sourceVersions } = costResult;

  const entries = buildLedgerEntries({ routeRunId, breakdown, phase, sourceVersions, createdBy });
  const { data: insertedEntries, error } = await client.from('cost_ledger_entries').insert(entries).select();
  if (error) throw error;

  let allocationRows = [];
  if (persistAllocations) {
    const alloc = allocateRouteCost(costResult);
    allocationRows = alloc.allocations.map((a) => ({
      cost_ledger_entry_id: null, // filled below
      booking_id: a.booking_id,
      reference_type: 'booking',
      reference_id: a.booking_id,
      allocation_method: inferMethod(a.category),
      allocated_amount_cents: a.allocated_amount_cents,
    }));

    // Map allocations to the corresponding ledger entry id by category.
    const entryByCategory = {};
    for (const e of insertedEntries || []) {
      entryByCategory[e.category] = e.id;
    }
    allocationRows = allocationRows
      .filter((a) => entryByCategory[a.category])
      .map((a) => ({ ...a, cost_ledger_entry_id: entryByCategory[a.category] }));

    if (allocationRows.length) {
      const { error: allocError } = await client.from('job_cost_allocations').insert(allocationRows);
      if (allocError) throw allocError;
    }
  }

  return { entries: insertedEntries, allocations: allocationRows };
}

function buildLedgerEntries({ routeRunId, breakdown, phase, sourceVersions, createdBy }) {
  const entries = [];

  const push = (category, amountCents, quantity, unit) => {
    if (amountCents === 0) return;
    const unitCost = quantity > 0 ? Math.round(amountCents / quantity) : amountCents;
    entries.push({
      route_run_id: routeRunId,
      category,
      phase,
      quantity,
      unit,
      unit_cost_cents: unitCost,
      amount_cents: amountCents,
      source_versions: sourceVersions || {},
      created_by: createdBy,
      reason: `${phase} cost`,
    });
  };

  push('rental_base', breakdown.rental.base_rental_cents, breakdown.rental.days, 'day');
  push('rental_mileage', breakdown.rental.mileage_charge_cents, breakdown.rental.mileage_km, 'km');
  push('fuel', breakdown.fuel.total_cents, breakdown.fuel.litres, 'litre');
  push('labor_wages', breakdown.labor.total_cents, breakdown.labor.hours, 'hour');
  push('disposal_flat', breakdown.disposal.total_cents, breakdown.disposal.predicted_weight_kg, 'kg');
  push('payment_fee', breakdown.overhead.payment_fee_cents, 0, 'revenue_share');
  push('supplies', breakdown.overhead.supplies_cents, 0, 'job');
  push('insurance', breakdown.overhead.insurance_cents, breakdown.rental.days, 'day');
  push('software', breakdown.overhead.software_cents, 0, 'monthly_share');
  push('admin', breakdown.overhead.admin_cents, 0, 'monthly_share');
  push('contingency', breakdown.overhead.contingency_cents, 0, 'revenue_share');
  push('risk_reserve', breakdown.overhead.risk_reserve_cents, 0, 'revenue_share');

  return entries;
}

function inferMethod(category) {
  const map = {
    rental_base: 'equal',
    rental_mileage: 'km',
    fuel: 'km',
    labor_wages: 'time',
    disposal_flat: 'weight',
    payment_fee: 'revenue',
    supplies: 'equal',
    insurance: 'time',
    software: 'revenue',
    admin: 'revenue',
    contingency: 'revenue',
    risk_reserve: 'revenue',
  };
  return map[category] || 'hybrid';
}

// ============================================================
// Profitability snapshots
// ============================================================

export async function persistProfitabilitySnapshot({
  routeRunId,
  bookingId,
  snapshotType,
  revenueCents,
  directCostCents,
  riskBufferCents,
  inputSnapshot,
  client = supabaseAdmin,
}) {
  const contribution = revenueCents - directCostCents;
  const marginPercent = revenueCents ? (contribution / revenueCents) * 100 : 0;
  const decision = contribution < 0 ? 'reject' : contribution < riskBufferCents ? 'review' : 'accept';

  const { data, error } = await client.from('profitability_snapshots').insert({
    route_run_id: routeRunId,
    booking_id: bookingId,
    snapshot_type: snapshotType,
    revenue_cents: revenueCents,
    direct_cost_cents: directCostCents,
    contribution_cents: contribution,
    margin_percent: roundCurrency(marginPercent, 4),
    risk_buffer_cents: riskBufferCents,
    decision,
    input_snapshot: inputSnapshot || {},
  }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// Expense receipts
// ============================================================

export async function createExpenseReceipt({
  routeRunId,
  routeStopId,
  employeeId,
  receiptImageUrl,
  ocrRaw,
  ocrVendor,
  ocrConfidence,
  verifiedAmountCents,
  verifiedCategory,
  verifiedVendor,
  reviewerId,
  auditStatus = 'pending',
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('expense_receipts').insert({
    route_run_id: routeRunId,
    route_stop_id: routeStopId,
    employee_id: employeeId,
    receipt_image_url: receiptImageUrl,
    ocr_raw: ocrRaw || {},
    ocr_vendor: ocrVendor,
    ocr_confidence: ocrConfidence,
    verified_amount_cents: verifiedAmountCents,
    verified_category: verifiedCategory,
    verified_vendor: verifiedVendor,
    reviewer_id: reviewerId,
    audit_status: auditStatus,
  }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// Canonical helpers for quoting/dispatch/reporting
// ============================================================

export async function quoteWithCost({
  booking,
  routeType = 'junkhaul_dirty',
  asOf = new Date().toISOString(),
  distanceKm,
  revenueCents,
  client = supabaseAdmin,
} = {}) {
  const cost = await calculateRouteCost({
    routeType,
    bookings: [booking],
    asOf,
    distanceKm,
    revenueCents,
    client,
  });
  return cost;
}

// Re-export money helpers for callers.
export { toCents, fromCents, centsToDollarsString };
