// ============================================================
// routeEngine.js
//
// Full-day route planner for Junkhaul dirty routes.
//
// Lifecycle model:
//   home -> U-Haul pickup (Balzac) -> jobs -> facility -> fuel ->
//   U-Haul return (Balzac) -> home
//
// Uses Mapbox Directions for real distance/duration. Falls back to
// haversine for ordering and distance if Mapbox is unavailable.
// Tracks truck volume and weight after every pickup/drop.
// Respects time windows and facility hours.
// Outputs a versioned route proposal (route_status = 'proposed') that
// requires dispatch approval before it becomes 'active'.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { getVehicleProfileByClass } from './costConfig.js';
import { edmontonNowParts } from './dates.js';

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Business constants
export const HOME = {
  id: 'home',
  name: 'Home / Depot',
  address: '11965 Coventry Hills Way NE, Calgary, AB',
  lat: 51.16056,
  lng: -114.05,
  type: 'home',
};

export const DEPOT = {
  id: 'depot',
  name: 'U-Haul Pickup / Return',
  address: 'Gas Plus Balzac, 10070 Hwy 566, Balzac, AB T4B 2T3',
  lat: 51.2128,
  lng: -114.0081,
  type: 'depot',
};

export const DEFAULT_LANDFILL = {
  id: 'landfill_default',
  name: 'East Calgary Landfill',
  address: '3801 68 St SE, Calgary, AB',
  lat: 51.0379,
  lng: -113.9829,
  type: 'landfill',
  hours: { open: 7, close: 19 },
  accepts: ['general', 'mixed'],
};

const DEFAULT_VEHICLE = {
  name: 'U-Haul 15ft',
  vehicle_class: 'uhaul_15ft',
  volume_cuft: 764,
  volume_yd3: 28.3,
  legal_payload_kg: 2897,
  operational_weight_limit_kg: 2500,
  fuel_baseline_l_per_100km: 45,
};

const TANK_CAPACITY_L = 80;
const FUEL_RESERVE_L = 15;
const MAX_MAPBOX_COORDS = 25;
const SERVICE_MINUTES = {
  single_item: 15,
  quarter: 30,
  half: 45,
  full: 60,
};

// Load-size volume and weight defaults. Use AI weight estimate when present.
export function loadProfile(loadSize, aiWeightKg) {
  const percent = { single_item: 5, quarter: 25, half: 50, full: 100 }[loadSize] || 50;
  const defaultWeight = { single_item: 50, quarter: 250, half: 500, full: 1000 }[loadSize] || 500;
  return {
    volume_pct: percent,
    weight_kg: typeof aiWeightKg === 'number' && aiWeightKg > 0 ? aiWeightKg : defaultWeight,
  };
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function coord(stop) {
  return { lat: stop.lat, lng: stop.lng };
}

async function mapboxRoute(coords) {
  if (!MAPBOX_TOKEN || coords.length < 2) return null;
  if (coords.length > MAX_MAPBOX_COORDS) return null; // split not handled here
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?access_token=${MAPBOX_TOKEN}&overview=full&steps=false&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const legs = (route.legs || []).map((leg, i) => ({
        fromIndex: i,
        toIndex: i + 1,
        distanceKm: leg.distance / 1000,
        durationMin: leg.duration / 60,
      }));
      return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        legs,
      };
    }
  } catch (err) {
    console.error('Mapbox directions failed:', err.message);
  }
  return null;
}

function fallbackRoute(coords) {
  const legs = [];
  let distanceKm = 0;
  let durationMin = 0;
  const speedKmh = 50;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineKm(coords[i - 1], coords[i]);
    distanceKm += d;
    durationMin += (d / speedKmh) * 60;
    legs.push({ fromIndex: i - 1, toIndex: i, distanceKm: d, durationMin: (d / speedKmh) * 60 });
  }
  return { distanceKm, durationMin, legs };
}

async function routeFor(coords) {
  const mb = await mapboxRoute(coords);
  return mb || fallbackRoute(coords);
}

function parseFacilityHours(facility) {
  if (facility.hours && typeof facility.hours === 'object' && facility.hours.open !== undefined) {
    return facility.hours;
  }
  return { open: 7, close: 19 };
}

export function facilityOpenAt(facility, arrivalTime) {
  const h = parseFacilityHours(facility);
  const hour = arrivalTime.getHours() + arrivalTime.getMinutes() / 60;
  return hour >= h.open && hour < h.close;
}

function earliestNextOpen(facility, arrivalTime) {
  const h = parseFacilityHours(facility);
  const hour = arrivalTime.getHours() + arrivalTime.getMinutes() / 60;
  if (hour < h.open) {
    const next = new Date(arrivalTime);
    next.setHours(h.open, 0, 0, 0);
    return next;
  }
  if (hour >= h.close) {
    const next = new Date(arrivalTime);
    next.setDate(next.getDate() + 1);
    next.setHours(h.open, 0, 0, 0);
    return next;
  }
  return arrivalTime;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sortJobs(jobs, start) {
  const sorted = [...jobs];
  sorted.sort((a, b) => {
    // Do not reorder jobs that are already en_route or in_progress.
    const aLocked = a.crew_status === 'en_route' || a.crew_status === 'in_progress';
    const bLocked = b.crew_status === 'en_route' || b.crew_status === 'in_progress';
    if (aLocked && !bLocked) return -1;
    if (!aLocked && bLocked) return 1;

    // Time window ordering.
    const aTime = a.window_start || a.job_time || '99:99';
    const bTime = b.window_start || b.job_time || '99:99';
    const timeCompare = aTime.localeCompare(bTime);
    if (timeCompare !== 0) return timeCompare;

    // Nearest neighbor from start.
    return haversineKm(start, coord(a)) - haversineKm(start, coord(b));
  });
  return sorted;
}

function selectFacility(available, arrivalTime, current, destinationType = 'landfill') {
  const openFacilities = (available || [DEFAULT_LANDFILL])
    .filter((f) => f.type === destinationType || destinationType === 'landfill')
    .filter((f) => facilityOpenAt(f, arrivalTime));

  if (openFacilities.length === 0) {
    const best = (available || [DEFAULT_LANDFILL])
      .filter((f) => f.type === destinationType || destinationType === 'landfill')
      .sort((a, b) => haversineKm(current, coord(a)) - haversineKm(current, coord(b)))[0];
    return { facility: best, waitUntil: earliestNextOpen(best, arrivalTime) };
  }

  openFacilities.sort((a, b) => haversineKm(current, coord(a)) - haversineKm(current, coord(b)));
  return { facility: openFacilities[0], waitUntil: null };
}

function addStop(list, stop) {
  list.push({ ...stop, sequence: list.length + 1 });
}

export async function buildFullDayRoute({
  crewAssignmentId,
  crewLat,
  crewLng,
  vehicleClass = 'uhaul_15ft',
  client = supabaseAdmin,
} = {}) {
  const now = new Date();
  const { date: todayStr } = edmontonNowParts();

  const { data: assignment, error: aErr } = await client
    .from('crew_assignments')
    .select('*')
    .eq('id', crewAssignmentId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!assignment) throw new Error('Crew assignment not found');

  const { data: bookings, error: bErr } = await client
    .from('bookings')
    .select('*')
    .eq('job_date', assignment.assignment_date || todayStr)
    .eq('crew_assignment_id', crewAssignmentId)
    .in('status', ['confirmed', 'scheduled', 'in_progress', 'rescheduled']);
  if (bErr) throw bErr;

  let vehicle;
  try {
    vehicle = await getVehicleProfileByClass(vehicleClass, client);
  } catch {
    vehicle = DEFAULT_VEHICLE;
  }

  const capacityVolumePct = 100;
  const weightLimitKg = vehicle.operational_weight_limit_kg || DEFAULT_VEHICLE.operational_weight_limit_kg;
  const fuelLPer100Km = vehicle.fuel_baseline_l_per_100km || DEFAULT_VEHICLE.fuel_baseline_l_per_100km;

  const { data: facilities } = await client
    .from('landfills')
    .select('id, name, address, lat, lng, monday_to_friday, sunday_open, summer_only_sunday')
    .order('created_at', { ascending: true });

  const mappedFacilities = (facilities || [DEFAULT_LANDFILL]).map((f) => ({
    id: f.id,
    name: f.name,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    type: 'landfill',
    hours: { open: 7, close: 19 },
  }));

  // Start at current crew location or home.
  const start = { lat: crewLat ?? HOME.lat, lng: crewLng ?? HOME.lng };

  const stops = [];
  const reasons = [];

  // 1. U-Haul pickup at the start of the day.
  addStop(stops, { ...DEPOT, status: 'upcoming', stop_type: 'depot_pickup', capacity_before_pct: 0, capacity_after_pct: 0 });

  // 2. Sort and insert jobs.
  const sortedJobs = sortJobs(bookings || [], DEPOT);

  let currentVolumePct = 0;
  let currentWeightKg = 0;
  let lastCoords = coord(DEPOT);
  let currentTime = new Date(now);
  currentTime.setHours(8, 0, 0, 0); // Assume 8:00 AM start.

  for (const job of sortedJobs) {
    const profile = loadProfile(job.load_size, job.ai_weight_estimate_kg);
    const projectedVolume = currentVolumePct + profile.volume_pct;
    const projectedWeight = currentWeightKg + profile.weight_kg;

    const overVolume = projectedVolume > capacityVolumePct;
    const overWeight = projectedWeight > weightLimitKg;

    if (overVolume || overWeight) {
      const { facility, waitUntil } = selectFacility(mappedFacilities, currentTime, lastCoords, 'landfill');
      if (waitUntil) {
        currentTime = waitUntil;
        reasons.push(`Wait until ${facility.name} opens at ${waitUntil.toISOString()}`);
      }
      addStop(stops, {
        ...facility,
        id: `landfill_${stops.length}`,
        status: 'required',
        stop_type: 'landfill',
        capacity_before_pct: currentVolumePct,
        capacity_after_pct: 0,
      });
      reasons.push(`${overWeight ? 'Weight' : 'Volume'} limit reached before job ${job.id}: inserted ${facility.name}`);
      currentVolumePct = 0;
      currentWeightKg = 0;
      lastCoords = coord(facility);
    }

    addStop(stops, {
      id: job.id,
      booking_id: job.id,
      name: job.name,
      address: job.address,
      lat: job.lat,
      lng: job.lng,
      type: 'customer',
      status: job.crew_status === 'in_progress' ? 'in_progress' : 'upcoming',
      time_window: job.window_label || job.job_time,
      load_size: job.load_size,
      total_price: job.total_price,
      capacity_before_pct: currentVolumePct,
      capacity_after_pct: currentVolumePct + profile.volume_pct,
    });
    currentVolumePct += profile.volume_pct;
    currentWeightKg += profile.weight_kg;
    lastCoords = coord(job);

    // Advance time by service duration.
    const serviceMin = SERVICE_MINUTES[job.load_size] || 30;
    currentTime = new Date(currentTime.getTime() + serviceMin * 60 * 1000);
  }

  // 3. Final facility drop if there is any remaining load.
  if (currentVolumePct > 0 || currentWeightKg > 0) {
    const { facility, waitUntil } = selectFacility(mappedFacilities, currentTime, lastCoords, 'landfill');
    if (waitUntil) currentTime = waitUntil;
    addStop(stops, {
      ...facility,
      id: `landfill_${stops.length}`,
      status: 'required',
      stop_type: 'landfill',
      capacity_before_pct: currentVolumePct,
      capacity_after_pct: 0,
    });
    currentVolumePct = 0;
    currentWeightKg = 0;
    lastCoords = coord(facility);
    reasons.push('Final landfill drop after all jobs');
  }

  // 4. Fuel stop if fuel needed exceeds reserve.
  // Compute rough total route distance from ordered stops.
  const fullRouteCoords = [HOME, DEPOT, ...stops.filter((s) => s.lat && s.lng).map(coord), DEPOT, HOME];
  const routeResult = await routeFor(fullRouteCoords);
  const estimatedFuelL = (routeResult.distanceKm / 100) * fuelLPer100Km;
  if (estimatedFuelL > TANK_CAPACITY_L - FUEL_RESERVE_L) {
    addStop(stops, {
      id: `fuel_${stops.length}`,
      name: 'Fuel stop',
      address: 'En-route fuel station',
      lat: lastCoords.lat,
      lng: lastCoords.lng,
      type: 'fuel',
      status: 'required',
      capacity_before_pct: 0,
      capacity_after_pct: 0,
    });
    reasons.push(`Fuel required: ${estimatedFuelL.toFixed(0)}L estimated, tank capacity ${TANK_CAPACITY_L}L`);
  }

  // 5. U-Haul return and home.
  addStop(stops, { ...DEPOT, status: 'upcoming', stop_type: 'depot_return', capacity_before_pct: 0, capacity_after_pct: 0 });
  addStop(stops, { ...HOME, status: 'upcoming', stop_type: 'home', capacity_before_pct: 0, capacity_after_pct: 0 });

  // Recompute final route with actual ordered stops for per-leg distances.
  const finalCoords = stops.filter((s) => s.lat && s.lng).map(coord);
  const finalRoute = await routeFor(finalCoords);

  // Assign ETAs and leg distances.
  let elapsedMin = 0;
  const startOfDay = new Date(now);
  startOfDay.setHours(8, 0, 0, 0);
  stops.forEach((stop, i) => {
    stop.estimated_arrival = new Date(startOfDay.getTime() + elapsedMin * 60 * 1000).toISOString();
    stop.eta_minutes_from_start = Math.round(elapsedMin);
    const leg = finalRoute.legs[i];
    if (leg) {
      stop.leg_distance_km = Math.round(leg.distanceKm * 10) / 10;
      stop.leg_duration_min = Math.round(leg.durationMin);
      elapsedMin += leg.durationMin;
    }
    const serviceMin = stop.stop_type === 'customer' ? (SERVICE_MINUTES[stop.load_size] || 30) : 0;
    elapsedMin += serviceMin;
  });

  const routePlan = {
    crew_assignment_id: crewAssignmentId,
    route_version: 1,
    crew_id: String(crewAssignmentId),
    current_stop_id: stops.find((s) => s.status === 'in_progress')?.id || stops[0]?.id || null,
    stops: stops.map((s) => ({ ...s, sequence: s.sequence })),
    decision_reason: reasons.length > 0 ? reasons.join('; ') : 'Route optimized by time window, capacity, facility hours and real driving distance.',
    generated_at: now.toISOString(),
    route_status: 'proposed',
    requires_acknowledgment: true,
    route_updated_at: now.toISOString(),
    route_change_reason: 'New full-day route proposal generated',
    total_distance_km: Math.round(finalRoute.distanceKm * 10) / 10,
    total_duration_min: Math.round(finalRoute.durationMin),
    vehicle_snapshot: {
      vehicle_class: vehicle.vehicle_class,
      volume_cuft: vehicle.volume_cuft,
      operational_weight_limit_kg: weightLimitKg,
      fuel_baseline_l_per_100km: fuelLPer100Km,
    },
  };

  return routePlan;
}

export async function saveRoutePlan(routePlan, client = supabaseAdmin) {
  const insert = {
    crew_assignment_id: routePlan.crew_assignment_id,
    route_version: routePlan.route_version,
    crew_id: routePlan.crew_id,
    current_stop_id: routePlan.current_stop_id,
    stops: routePlan.stops,
    decision_reason: routePlan.decision_reason,
    route_status: routePlan.route_status,
    requires_acknowledgment: routePlan.requires_acknowledgment,
    route_change_reason: routePlan.route_change_reason,
    route_updated_at: routePlan.route_updated_at,
    generated_at: routePlan.generated_at,
  };
  const { data, error } = await client.from('route_plans').insert(insert).select().single();
  if (error) throw error;

  // Mark this as the current proposal for the assignment.
  await client.from('crew_assignments').update({
    current_route_version: data.route_version,
    current_route_plan_id: data.id,
  }).eq('id', routePlan.crew_assignment_id);

  return data;
}

// ------------------------------------------------------------
// getLandfillDecision — single decision for the next job.
// Replaces the old fuel-percent-based decision with volume/weight.
// ------------------------------------------------------------
export async function getLandfillDecision(crewAssignmentId, crewLat, crewLng, client = supabaseAdmin) {
  const now = new Date();
  const { data: assignment } = await client
    .from('crew_assignments')
    .select('assignment_date')
    .eq('id', crewAssignmentId)
    .maybeSingle();
  if (!assignment) throw new Error('Crew assignment not found');

  const { data: remainingJobs } = await client
    .from('bookings')
    .select('*')
    .eq('job_date', assignment.assignment_date)
    .eq('crew_assignment_id', crewAssignmentId)
    .in('crew_status', ['confirmed', 'scheduled', 'en_route', 'arrived', 'in_progress'])
    .order('job_time', { ascending: true });

  const currentPos = { lat: crewLat || HOME.lat, lng: crewLng || HOME.lng };

  // Compute current load from completed jobs. For simplicity, treat any job
  // not in_progress/en_route as not yet loaded.
  let currentVolumePct = 0;
  let currentWeightKg = 0;
  for (const job of remainingJobs || []) {
    if (job.crew_status === 'completed') {
      const p = loadProfile(job.load_size, job.ai_weight_estimate_kg);
      currentVolumePct += p.volume_pct;
      currentWeightKg += p.weight_kg;
    }
  }

  const nextJob = remainingJobs?.find((j) => j.crew_status !== 'completed');
  const nextLoad = nextJob ? loadProfile(nextJob.load_size, nextJob.ai_weight_estimate_kg) : { volume_pct: 0, weight_kg: 0 };
  const projectedVolume = currentVolumePct + nextLoad.volume_pct;
  const projectedWeight = currentWeightKg + nextLoad.weight_kg;

  let vehicle;
  try {
    vehicle = await getVehicleProfileByClass('uhaul_15ft', client);
  } catch {
    vehicle = DEFAULT_VEHICLE;
  }
  const weightLimit = vehicle.operational_weight_limit_kg || DEFAULT_VEHICLE.operational_weight_limit_kg;

  const { data: facilities } = await client
    .from('landfills')
    .select('id, name, address, lat, lng')
    .order('created_at', { ascending: true });

  const mapped = (facilities || [DEFAULT_LANDFILL]).map((f) => ({ ...f, type: 'landfill', hours: { open: 7, close: 19 } }));
  const { facility } = selectFacility(mapped, now, currentPos, 'landfill');

  if (projectedVolume >= 100 || projectedWeight > weightLimit) {
    return {
      decision: 'landfill',
      reason: `Truck would be ${Math.round(projectedVolume)}% full / ${Math.round(projectedWeight)} kg after next job. Go to ${facility.name} before the next pickup.`,
      landfill: facility,
      current_fullness: Math.round(currentVolumePct),
      projected_fullness: Math.round(projectedVolume),
    };
  }

  return {
    decision: 'continue',
    reason: `Truck is ${Math.round(currentVolumePct)}% full / ${Math.round(currentWeightKg)} kg. Room for the next ${nextJob?.load_size || 'job'}.`,
    landfill: null,
    current_fullness: Math.round(currentVolumePct),
    projected_fullness: Math.round(projectedVolume),
  };
}

// ------------------------------------------------------------
// insertStopMidRoute — add a new booking/opportunistic stop into an
// existing route plan and re-sequence upcoming stops to minimize added
// drive time. Returns a new route proposal (not persisted).
// ------------------------------------------------------------
export function insertStopMidRoute(currentRoute, newBooking) {
  const stops = (currentRoute.stops || []).map((s) => ({ ...s }));
  const completedCount = stops.filter((s) => s.status === 'completed' || s.status === 'in_progress').length;
  const newCoord = { lat: newBooking.lat || newBooking.address_data?.lat, lng: newBooking.lng || newBooking.address_data?.lng };
  if (typeof newCoord.lat !== 'number') {
    throw new Error('New booking has no coordinates');
  }

  const before = stops.slice(0, completedCount);
  const upcoming = stops.slice(completedCount).filter((s) => s.type === 'customer');
  const trailing = stops.slice(completedCount).filter((s) => s.type !== 'customer');

  let bestIdx = 0;
  let bestAdded = Infinity;
  for (let i = 0; i <= upcoming.length; i++) {
    const prev = i === 0 ? (before[before.length - 1] || DEPOT) : upcoming[i - 1];
    const next = i === upcoming.length ? null : upcoming[i];
    let added = 0;
    if (prev) added += haversineKm(coord(prev), newCoord);
    if (next) added += haversineKm(newCoord, coord(next));
    if (prev && next) added -= haversineKm(coord(prev), coord(next));
    if (added < bestAdded) {
      bestAdded = added;
      bestIdx = i;
    }
  }

  const newStop = {
    id: newBooking.id,
    booking_id: newBooking.id,
    name: newBooking.name,
    address: newBooking.address,
    lat: newCoord.lat,
    lng: newCoord.lng,
    type: 'customer',
    status: 'upcoming',
    time_window: newBooking.window_label || newBooking.job_time,
    load_size: newBooking.load_size,
    total_price: newBooking.total_price,
    opportunistic: newBooking.is_opportunistic || false,
    capacity_before_pct: 0,
    capacity_after_pct: 0,
  };

  const reordered = [...upcoming.slice(0, bestIdx), newStop, ...upcoming.slice(bestIdx), ...trailing];
  const merged = [...before, ...reordered];
  merged.forEach((s, i) => { s.sequence = i + 1; });

  return {
    ...currentRoute,
    route_version: (currentRoute.route_version || 1) + 1,
    stops: merged,
    route_status: 'proposed',
    requires_acknowledgment: true,
    route_change_reason: `New ${newStop.opportunistic ? 'opportunistic' : 'job'} stop added at position ${bestIdx + 1}. Added ~${Math.round(bestAdded)} km.`,
    route_updated_at: new Date().toISOString(),
  };
}

// Re-export compatibility shapes.
export async function generateRoutePlan(crewAssignmentId, crewLat, crewLng, client = supabaseAdmin) {
  const plan = await buildFullDayRoute({
    crewAssignmentId,
    crewLat,
    crewLng,
    client,
  });
  const saved = await saveRoutePlan(plan, client);
  return { ...plan, id: saved.id, route_version: saved.route_version };
}
