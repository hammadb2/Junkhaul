// ============================================================
// 24-HOUR DYNAMIC DISPATCH ENGINE
//
// On every new booking, resolveDispatch decides whether an existing
// crew assignment for the target date can absorb the job (based on
// truck fill, job count, and detour distance) or whether a new
// assignment needs to be created.
//
// The crew app already reads from crew_assignments + bookings by date,
// so once a crew_assignment_id is set on the booking, the existing
// schedule page, navigation, job execution flow, and landfill/storage
// steps all work unchanged.
//
// Config values (all in system_config, with safe code defaults):
//   dispatch_max_trucks_per_day   (default 3)
//   dispatch_detour_threshold_km  (default 15)
//   dispatch_truck_capacity_kg    (default 700)
//   dispatch_max_jobs_per_truck   (default 6)
//   dispatch_auto_assign          (default true)
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { getNumberConfig, getBooleanConfig } from './config.js';
import { edmontonNowParts } from './dates.js';
import { calculateRouteCost } from './costLedger.js';
import { buildFullDayRoute, saveRoutePlan, insertStopMidRoute } from './routeEngine.js';

// Default U-Haul pickup depot: Gas Plus, 100 Main Street, Balzac, AB.
const DEFAULT_DEPOT = {
  name: 'Gas Plus - 100 Main St, Balzac',
  lat: 51.2128,
  lng: -114.0081,
};

// Load-size weight equivalents (kg) — matches pricingConstants.
const LOAD_WEIGHTS = {
  single_item: 150,
  quarter: 300,
  half: 500,
  full: 700,
};

// Haversine distance in km (same approximation as nearby-opportunities).
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// ============================================================
// resolveDispatch — the main entry point.
//
// Given a newly-created booking (with lat/lng/load_size/job_date),
// finds or creates a crew_assignment for that date and links the
// booking to it.
//
// Returns: { assignment_id, action, reason }
//   action: 'reused' | 'created' | 'unassigned'
// ============================================================
export async function resolveDispatch(booking) {
  // Check if auto-dispatch is enabled
  const autoAssign = await getBooleanConfig('dispatch_auto_assign', true);
  if (!autoAssign) {
    return { assignment_id: null, action: 'unassigned', reason: 'auto_assign disabled' };
  }

  if (!booking.job_date || !booking.lat || !booking.lng) {
    return { assignment_id: null, action: 'unassigned', reason: 'missing geo or date' };
  }

  const maxTrucks = await getNumberConfig('dispatch_max_trucks_per_day', 3);
  const detourThreshold = await getNumberConfig('dispatch_detour_threshold_km', 15);
  const truckCapacity = await getNumberConfig('dispatch_truck_capacity_kg', 700);
  const maxJobsPerTruck = await getNumberConfig('dispatch_max_jobs_per_truck', 6);

  // 1. Fetch all crew_assignments for the booking's date.
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_employee_id, secondary_employee_id, uhaul_location, uhaul_location_lat, uhaul_location_lng, status')
    .eq('assignment_date', booking.job_date);

  // 2. For each assignment, fetch its bookings and compute fill + detour.
  let bestFit = null;
  let bestFitScore = Infinity;

  for (const assignment of assignments || []) {
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, lat, lng, load_size, ai_weight_estimate_kg, crew_assignment_id, status')
      .eq('job_date', booking.job_date)
      .in('status', ['confirmed', 'completed', 'pending_payment', 'scheduled', 'in_progress']);

    // Bookings already linked to this assignment (or unlinked but on the same date — backward compat).
    const truckBookings = (existingBookings || []).filter(
      (b) => b.crew_assignment_id === assignment.id || (!b.crew_assignment_id && assignments.length === 1)
    );

    // Check job count capacity.
    if (truckBookings.length >= maxJobsPerTruck) continue;

    // Compute current truck fill (kg).
    const totalKg = truckBookings.reduce(
      (sum, b) => sum + (b.ai_weight_estimate_kg || LOAD_WEIGHTS[b.load_size] || 0),
      0
    );
    const newJobKg = booking.ai_weight_estimate_kg || LOAD_WEIGHTS[booking.load_size] || 0;
    if (totalKg + newJobKg > truckCapacity) continue;

    // Compute detour: distance from the new booking to the nearest existing stop.
    // If this is the first job on the truck, detour is 0.
    let minDist = 0;
    if (truckBookings.length > 0) {
      minDist = Math.min(
        ...truckBookings
          .filter((b) => b.lat && b.lng)
          .map((b) => haversineKm(booking.lat, booking.lng, b.lat, b.lng))
      );
    }

    if (minDist > detourThreshold) continue;

    // Score: prefer the truck with the smallest detour.
    if (minDist < bestFitScore) {
      bestFitScore = minDist;
      bestFit = { assignment, detour: minDist, jobCount: truckBookings.length + 1 };
    }
  }

  // 3. If we found a fitting assignment, link the booking to it.
  if (bestFit) {
    await supabaseAdmin
      .from('bookings')
      .update({ crew_assignment_id: bestFit.assignment.id })
      .eq('id', booking.id);

    return {
      assignment_id: bestFit.assignment.id,
      action: 'reused',
      reason: `fits on existing truck (${bestFit.jobCount} jobs, ${bestFit.detour.toFixed(1)}km detour)`,
    };
  }

  // 4. No existing assignment can absorb it — create a new one if under capacity.
  const currentTruckCount = (assignments || []).length;
  if (currentTruckCount >= maxTrucks) {
    // At capacity — leave unassigned; admin will need to handle manually.
    return {
      assignment_id: null,
      action: 'unassigned',
      reason: `max trucks (${maxTrucks}) reached for ${booking.job_date}`,
    };
  }

  // Find an available employee to drive.
  const assignedDriverIds = (assignments || [])
    .map((a) => a.driver_employee_id)
    .filter(Boolean);

  const { data: availableEmployees } = await supabaseAdmin
    .from('employees')
    .select('id, name, first_name, last_name')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  const availableDriver = (availableEmployees || []).find(
    (e) => !assignedDriverIds.includes(e.id)
  );

  if (!availableDriver) {
    return {
      assignment_id: null,
      action: 'unassigned',
      reason: 'no available driver for new truck',
    };
  }

  // Create the new crew assignment.
  const { data: newAssignment, error } = await supabaseAdmin
    .from('crew_assignments')
    .insert({
      assignment_date: booking.job_date,
      driver_employee_id: availableDriver.id,
      uhaul_location: DEFAULT_DEPOT.name,
      uhaul_location_lat: DEFAULT_DEPOT.lat,
      uhaul_location_lng: DEFAULT_DEPOT.lng,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    console.error('dispatch: failed to create crew_assignment:', error.message);
    return { assignment_id: null, action: 'unassigned', reason: `create failed: ${error.message}` };
  }

  // Link the booking to the new assignment.
  await supabaseAdmin
    .from('bookings')
    .update({ crew_assignment_id: newAssignment.id })
    .eq('id', booking.id);

  return {
    assignment_id: newAssignment.id,
    action: 'created',
    reason: `new truck #${currentTruckCount + 1} assigned to ${availableDriver.name || availableDriver.first_name}`,
  };
}

// ============================================================
// recommendLandfillDonation — checks if a route's projected load
// justifies a landfill or donation stop and returns a recommendation.
//
// This is advisory — the crew app already has landfill/donation
// steps. This just flags whether the route needs one based on
// total weight.
// ============================================================
export async function recommendLandfillDonation(assignmentId) {
  const truckCapacity = await getNumberConfig('dispatch_truck_capacity_kg', 700);

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('load_size, ai_weight_estimate_kg')
    .eq('crew_assignment_id', assignmentId)
    .in('status', ['confirmed', 'completed', 'pending_payment', 'scheduled', 'in_progress']);

  const totalKg = (bookings || []).reduce(
    (sum, b) => sum + (b.ai_weight_estimate_kg || LOAD_WEIGHTS[b.load_size] || 0),
    0
  );
  const fillPct = Math.min(1, totalKg / truckCapacity);

  // If the truck is >50% full, recommend a landfill stop.
  // Also fetch the nearest landfill for convenience.
  let recommendation = null;
  if (fillPct >= 0.5) {
    const { data: landfills } = await supabaseAdmin
      .from('landfills')
      .select('name, address, lat, lng')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (landfills && landfills.length > 0) {
      recommendation = {
        type: 'landfill',
        fillPct,
        totalKg,
        destination: landfills[0],
      };
    }
  }

  // Check if any booking has donateable items (itemized_items with donate flag).
  // For now, we just flag that donation might be needed if there are multiple jobs.
  const { data: allBookings } = await supabaseAdmin
    .from('bookings')
    .select('itemized_items')
    .eq('crew_assignment_id', assignmentId)
    .not('itemized_items', 'is', null);

  const hasDonateableItems = (allBookings || []).some((b) => {
    if (!b.itemized_items) return false;
    try {
      const items = typeof b.itemized_items === 'string' ? JSON.parse(b.itemized_items) : b.itemized_items;
      return Array.isArray(items) && items.some((it) => it.donate === true);
    } catch {
      return false;
    }
  });

  if (hasDonateableItems) {
    const { data: donationCenters } = await supabaseAdmin
      .from('donation_centers')
      .select('name, address, lat, lng')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (donationCenters && donationCenters.length > 0) {
      recommendation = recommendation || { type: null, fillPct, totalKg };
      recommendation.donationCenter = donationCenters[0];
    }
  }

  return recommendation;
}

// ============================================================
// ensureDailyAssignment — called by the retooled generate-slots cron.
//
// Seeds a baseline crew_assignment for a given date if none exists.
// This ensures there's always at least one truck to check capacity
// against when resolveDispatch runs.
// ============================================================
export async function ensureDailyAssignment(dateStr) {
  // Check if an assignment already exists for this date.
  const { data: existing } = await supabaseAdmin
    .from('crew_assignments')
    .select('id')
    .eq('assignment_date', dateStr)
    .limit(1);

  if (existing && existing.length > 0) {
    return { action: 'exists', assignment_id: existing[0].id };
  }

  // Find an available active employee.
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, name')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!employees || employees.length === 0) {
    return { action: 'no_driver', assignment_id: null };
  }

  const { data: assignment, error } = await supabaseAdmin
    .from('crew_assignments')
    .insert({
      assignment_date: dateStr,
      driver_employee_id: employees[0].id,
      uhaul_location: DEFAULT_DEPOT.name,
      uhaul_location_lat: DEFAULT_DEPOT.lat,
      uhaul_location_lng: DEFAULT_DEPOT.lng,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    return { action: 'error', assignment_id: null, error: error.message };
  }

  return { action: 'created', assignment_id: assignment.id };
}

// ============================================================
// Dispatch control centre — route feasibility, totals, publish,
// rollback and scenario mode.
// ============================================================

export async function loadRoutePlanForDate(date, client = supabaseAdmin) {
  const { data } = await client
    .from('route_plans')
    .select('*, crew_assignments(assignment_date, employee_ids)')
    .order('route_version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function computeDailyTotals(routePlan, client = supabaseAdmin) {
  if (!routePlan?.stops) return null;
  const customerStops = (routePlan.stops || []).filter((s) => s.type === 'customer');
  const bookingIds = customerStops.map((s) => s.booking_id).filter(Boolean);

  const { data: bookings } = await client.from('bookings').select('*').in('id', bookingIds);
  const revenueCents = (bookings || []).reduce((s, b) => s + (b.total_price_cents || 0), 0);

  let cost = null;
  try {
    cost = await calculateRouteCost({
      routeType: 'junkhaul_dirty',
      bookings: bookings || [],
      distanceKm: routePlan.total_distance_km || 0,
      durationMinutes: routePlan.total_duration_min || 0,
      revenueCents,
      client,
    });
  } catch (e) {
    // Missing cost config or incomplete bookings; return a partial summary.
  }

  const totalWeightKg = customerStops.reduce((s, st) => s + (st.weight_kg_after || st.weight_kg || 0), 0);
  const totalVolumePct = customerStops.reduce((s, st) => s + (st.volume_pct_after || st.volume_pct || 0), 0);

  return {
    jobs: customerStops.length,
    revenue_cents: revenueCents,
    direct_cost_cents: cost ? cost.totalCostCents : null,
    contribution_cents: cost ? cost.contributionCents : null,
    margin_percent: cost ? cost.marginPercent : null,
    total_km: routePlan.total_distance_km || 0,
    total_min: routePlan.total_duration_min || 0,
    labor_hours: cost ? cost.assumptions.total_minutes / 60 : (routePlan.total_duration_min || 0) / 60,
    peak_weight_kg: totalWeightKg,
    peak_volume_pct: totalVolumePct,
    risk_level: cost?.decision === 'reject' ? 'high' : cost?.decision === 'review' ? 'medium' : 'low',
    source_versions: cost?.sourceVersions || null,
    cost_breakdown: cost || null,
  };
}

export function validateRouteFeasibility(routePlan, bookings = []) {
  const exceptions = [];
  const stops = routePlan?.stops || [];
  const customerStops = stops.filter((s) => s.type === 'customer');

  const vehicle = routePlan?.vehicle_snapshot || { operational_weight_limit_kg: 2500, volume_cuft: 764 };
  const weightLimit = vehicle.operational_weight_limit_kg || 2500;

  const bookingMap = new Map(bookings.map((b) => [b.id, b]));

  let runningWeight = 0;
  let runningVolumePct = 0;
  for (const stop of customerStops) {
    const booking = bookingMap.get(stop.booking_id);
    const weight = stop.weight_kg_after || stop.weight_kg || booking?.ai_weight_estimate_kg || 100;
    const volumePct = stop.volume_pct_after || stop.volume_pct || 10;
    runningWeight += weight;
    runningVolumePct += volumePct;

    if (runningWeight > weightLimit) {
      exceptions.push({ exception_type: 'overweight', severity: 'high', description: `Stop ${stop.sequence} would exceed vehicle weight limit: ${Math.round(runningWeight)} kg > ${weightLimit} kg.`, booking_id: stop.booking_id });
    }
    if (runningVolumePct > 100) {
      exceptions.push({ exception_type: 'over_volume', severity: 'high', description: `Stop ${stop.sequence} would exceed vehicle volume: ${Math.round(runningVolumePct)}% > 100%.`, booking_id: stop.booking_id });
    }
    if (booking && booking.item_evidence_status && booking.item_evidence_status !== 'complete') {
      exceptions.push({ exception_type: 'missing_evidence', severity: 'medium', description: `Booking ${booking.id} is on the route with item evidence status '${booking.item_evidence_status}'.`, booking_id: booking.id });
    }
    if (booking && booking.flag_for_review) {
      exceptions.push({ exception_type: 'route_infeasible', severity: 'high', description: `Booking ${booking.id} is flagged for manual review before dispatch.`, booking_id: booking.id });
    }
  }

  const facilityStops = stops.filter((s) => s.type === 'facility');
  for (const f of facilityStops) {
    const hour = f.planned_arrival ? new Date(f.planned_arrival).getHours() : null;
    if (hour !== null && f.hours && (hour < f.hours.open || hour >= f.hours.close)) {
      exceptions.push({ exception_type: 'facility_closed', severity: 'high', description: `Facility ${f.name || f.id} arrival at ${hour}:00 is outside hours ${f.hours.open}:00–${f.hours.close}:00.` });
    }
  }

  return exceptions;
}

export async function getDispatchExceptions(routePlanId, client = supabaseAdmin) {
  const { data, error } = await client.from('dispatch_exceptions').select('*').eq('route_plan_id', routePlanId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function persistDispatchExceptions(routePlanId, exceptions, client = supabaseAdmin) {
  if (!exceptions.length) return [];
  const rows = exceptions.map((e) => ({ route_plan_id: routePlanId, booking_id: e.booking_id || null, exception_type: e.exception_type, severity: e.severity, description: e.description }));
  const { data, error } = await client.from('dispatch_exceptions').insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function publishRoute({ routePlanId, publishedBy, reason, client = supabaseAdmin }) {
  const { data: plan } = await client.from('route_plans').select('*').eq('id', routePlanId).single();
  if (!plan) throw new Error('Route plan not found');

  const bookingsRes = await client.from('bookings').select('*').in('id', (plan.stops || []).filter((s) => s.type === 'customer').map((s) => s.booking_id).filter(Boolean));
  const exceptions = validateRouteFeasibility(plan, bookingsRes.data || []);
  const unresolvedHigh = exceptions.filter((e) => e.severity === 'high');
  if (unresolvedHigh.length > 0) {
    await persistDispatchExceptions(routePlanId, exceptions, client);
    throw new Error(`Cannot publish route with ${unresolvedHigh.length} unresolved high-severity exception(s)`);
  }

  const { data, error } = await client.from('route_plans').update({
    route_status: 'active',
    requires_acknowledgment: true,
    published_by: publishedBy,
    published_at: new Date().toISOString(),
    published_reason: reason,
    route_updated_at: new Date().toISOString(),
  }).eq('id', routePlanId).select().single();
  if (error) throw error;

  await persistDispatchExceptions(routePlanId, exceptions, client);
  await client.from('crew_assignments').update({ current_route_plan_id: routePlanId, current_route_version: plan.route_version }).eq('id', plan.crew_assignment_id);
  return data;
}

export async function rollbackRoute({ routePlanId, rollbackToPlanId, rolledBackBy, reason, client = supabaseAdmin }) {
  const { data: target } = await client.from('route_plans').select('*').eq('id', rollbackToPlanId).single();
  if (!target) throw new Error('Target route plan not found');

  const { data, error } = await client.from('route_plans').update({
    route_status: 'rolled_back',
    rolled_back_to: rollbackToPlanId,
    rolled_back_by: rolledBackBy,
    rolled_back_at: new Date().toISOString(),
    route_change_reason: reason,
    route_updated_at: new Date().toISOString(),
  }).eq('id', routePlanId).select().single();
  if (error) throw error;

  await client.from('route_plans').update({ route_status: 'active', route_updated_at: new Date().toISOString() }).eq('id', rollbackToPlanId);
  await client.from('crew_assignments').update({ current_route_plan_id: rollbackToPlanId, current_route_version: target.route_version }).eq('id', target.crew_assignment_id);
  return data;
}

export async function createScenario({ baseRoutePlanId, changes = [], client = supabaseAdmin }) {
  const { data: base } = await client.from('route_plans').select('*').eq('id', baseRoutePlanId).single();
  if (!base) throw new Error('Base route plan not found');

  let modifiedStops = [...(base.stops || [])];
  const { add = [], remove = [], reorder = [] } = changes;

  for (const bookingId of remove) {
    modifiedStops = modifiedStops.filter((s) => s.booking_id !== bookingId);
  }
  for (const booking of add) {
    modifiedStops = insertStopMidRoute({ ...base, stops: modifiedStops }, booking).stops;
  }
  if (reorder.length) {
    const byId = new Map(modifiedStops.map((s) => [s.booking_id || s.id, s]));
    modifiedStops = reorder.map((id) => byId.get(id)).filter(Boolean);
  }

  modifiedStops.forEach((s, i) => { s.sequence = i + 1; });

  const scenarioPlan = {
    ...base,
    id: undefined,
    route_version: (base.route_version || 1) + 1,
    route_status: 'proposed',
    scenario_of: baseRoutePlanId,
    published_by: null, published_at: null, published_reason: null, rolled_back_to: null,
    route_change_reason: 'Scenario generated from dispatch control centre',
    route_updated_at: new Date().toISOString(),
    stops: modifiedStops,
  };

  const saved = await saveRoutePlan(scenarioPlan, client);
  return saved;
}
