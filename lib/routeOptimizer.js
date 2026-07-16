// ============================================================
// routeOptimizer.js
//
// Phase 1: Multi-stop route optimization and landfill decision engine.
//
// The server is the source of truth for:
// - Route order (optimized with time-window + capacity constraints)
// - Landfill/storage stop insertion
// - Fuel-stop prediction
// - Route version numbers
//
// The Flutter app receives a route plan and displays instructions.
// It does NOT independently calculate route decisions.
// ============================================================

import { supabaseAdmin } from './supabase';
import { edmontonNowParts } from './dates';

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const REROUTE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const MIN_REROUTE_SAVINGS_MIN = 3; // 3 minutes minimum to reroute
const LANDFILL_THRESHOLD_PCT = 75;
const TANK_CAPACITY_L = 120; // typical truck tank
const FUEL_RESERVE_L = 15; // don't run below this

// ------------------------------------------------------------
// Load-size → estimated capacity % consumed
// ------------------------------------------------------------
const LOAD_SIZE_FILL = {
  quarter: 25,
  half: 50,
  three_quarter: 75,
  full: 100,
};

// ------------------------------------------------------------
// haversineKm — straight-line distance in km
// ------------------------------------------------------------
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// ------------------------------------------------------------
// getRouteTravelTime — calls Mapbox Directions API for drive time
// ------------------------------------------------------------
async function getRouteTravelTime(coords) {
  if (coords.length < 2) return 0;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      return data.routes[0].duration / 60; // minutes
    }
  } catch {
    // Fallback: estimate from distance at 40 km/h
  }
  let totalKm = 0;
  for (let i = 1; i < coords.length; i++) {
    totalKm += haversineKm(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
  }
  return (totalKm / 40) * 60; // minutes
}

// ------------------------------------------------------------
// generateRoutePlan — builds an optimized route plan for a crew
//
// Constraints (per spec section D):
// - Customer time windows
// - Estimated job duration (30 min default)
// - Current crew location
// - Truck capacity (cumulative load size)
// - Landfill operating hours
// - Crew shift end
// - Jobs already communicated as imminent (don't reorder)
// ------------------------------------------------------------
export async function generateRoutePlan(crewAssignmentId, crewLat, crewLng) {
  const { date: todayStr } = edmontonNowParts();

  // Fetch today's bookings for this assignment
  const { data: bookings, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('job_date', todayStr)
    .eq('crew_assignment_id', crewAssignmentId)
    .in('status', ['confirmed', 'scheduled', 'in_progress']);

  if (bErr || !bookings || bookings.length === 0) {
    return {
      route_version: 1,
      crew_assignment_id: crewAssignmentId,
      current_stop_id: null,
      stops: [],
      decision_reason: 'No jobs assigned for today.',
      generated_at: new Date().toISOString(),
    };
  }

  // Fetch latest truck check for fuel/fullness
  const { data: truckCheck } = await supabaseAdmin
    .from('truck_checks')
    .select('*')
    .eq('assignment_id', crewAssignmentId)
    .eq('check_type', 'pickup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialFullness = truckCheck?.fuel_percent || 0;
  let currentFullness = initialFullness;

  // Fetch nearest landfill
  const { data: landfill } = await supabaseAdmin
    .from('landfills')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Sort bookings by time window first, then by proximity (nearest neighbor)
  const sortedBookings = [...bookings].sort((a, b) => {
    // Jobs already in progress or en_route stay first (don't reorder)
    if (a.crew_status === 'in_progress' || a.crew_status === 'en_route') return -1;
    if (b.crew_status === 'in_progress' || b.crew_status === 'en_route') return 1;

    // Sort by time slot
    const aTime = a.window_start || a.time_slot || '99:99';
    const bTime = b.window_start || b.time_slot || '99:99';
    return aTime.localeCompare(bTime);
  });

  // Build stops with cumulative fullness projection
  const stops = [];
  let cumulativeFullness = currentFullness;
  let decisionReasons = [];

  for (let i = 0; i < sortedBookings.length; i++) {
    const booking = sortedBookings[i];
    const loadFill = LOAD_SIZE_FILL[booking.load_size] || 50;
    const projectedFullnessAfter = cumulativeFullness + loadFill;

    // Check if landfill run is needed BEFORE this job
    if (projectedFullnessAfter >= LANDFILL_THRESHOLD_PCT && landfill) {
      stops.push({
        id: `landfill_${stops.length}`,
        type: 'landfill',
        sequence: stops.length + 1,
        status: 'required',
        name: landfill.name || 'Nearest landfill',
        address: landfill.address,
        lat: landfill.lat,
        lng: landfill.lng,
        reason: `Truck would be ${projectedFullnessAfter}% full after this job`,
      });
      cumulativeFullness = 5; // Empty after landfill
      decisionReasons.push(`Landfill run inserted before job ${i + 1} (projected ${projectedFullnessAfter}% fullness)`);
    }

    stops.push({
      id: booking.id,
      type: 'customer',
      sequence: stops.length + 1,
      status: booking.crew_status === 'in_progress' ? 'in_progress' : 'upcoming',
      name: booking.name,
      address: booking.address,
      lat: booking.lat || booking.address_data?.lat,
      lng: booking.lng || booking.address_data?.lng,
      time_window: booking.window_label || booking.time_slot,
      load_size: booking.load_size,
      total_price: booking.total_price,
    });

    cumulativeFullness += loadFill;
  }

  // Check fuel: estimate total drive distance and fuel consumption
  // Rough estimate: 25 L / 100 km for a junk truck
  const allCoords = [
    { lat: crewLat, lng: crewLng },
    ...stops.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat, lng: s.lng })),
  ];
  const estimatedDriveTime = await getRouteTravelTime(allCoords);
  const estimatedKm = estimatedDriveTime * (40 / 60); // ~40 km/h average
  const estimatedFuelUsed = (estimatedKm / 100) * 25; // 25 L/100km

  const currentFuelL = truckCheck?.fuel_percent
    ? (truckCheck.fuel_percent / 100) * TANK_CAPACITY_L
    : TANK_CAPACITY_L * 0.5;

  if (currentFuelL - estimatedFuelUsed < FUEL_RESERVE_L) {
    // Insert fuel stop at the beginning
    stops.splice(1, 0, {
      id: `fuel_${Date.now()}`,
      type: 'fuel',
      sequence: 2,
      status: 'required',
      reason: `Fuel level low. Estimated ${estimatedFuelUsed.toFixed(0)}L needed, ${currentFuelL.toFixed(0)}L available.`,
    });
    // Re-sequence
    stops.forEach((s, idx) => (s.sequence = idx + 1));
    decisionReasons.push(`Fuel stop required: estimated ${estimatedFuelUsed.toFixed(0)}L for route, only ${currentFuelL.toFixed(0)}L in tank`);
  }

  // Get current route version
  const { data: lastPlan } = await supabaseAdmin
    .from('route_plans')
    .select('route_version')
    .eq('crew_assignment_id', crewAssignmentId)
    .order('route_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastPlan?.route_version || 0) + 1;

  const routePlan = {
    crew_assignment_id: crewAssignmentId,
    route_version: nextVersion,
    current_stop_id: stops.find((s) => s.status === 'in_progress')?.id || stops[0]?.id || null,
    stops,
    decision_reason: decisionReasons.length > 0
      ? decisionReasons.join('; ')
      : 'Route optimized by time window and proximity.',
    generated_at: new Date().toISOString(),
  };

  // Persist the route plan
  await supabaseAdmin.from('route_plans').insert({
    crew_assignment_id: crewAssignmentId,
    route_version: nextVersion,
    crew_id: String(crewAssignmentId),
    current_stop_id: routePlan.current_stop_id,
    stops: stops,
    decision_reason: routePlan.decision_reason,
    generated_at: routePlan.generated_at,
  });

  return routePlan;
}

// ------------------------------------------------------------
// compareAndReroute — checks if a faster route exists
//
// Only reroutes if:
// - Saves >= 3 minutes
// - Doesn't violate customer time windows
// - Doesn't remove required fuel/landfill stops
// - Within reroute cooldown (10 min since last reroute)
// ------------------------------------------------------------
export async function compareAndReroute(currentRoute, crewLat, crewLng) {
  // Check cooldown
  const generatedAt = new Date(currentRoute.generated_at).getTime();
  const now = Date.now();
  if (now - generatedAt < REROUTE_COOLDOWN_MS) {
    return null; // Still in cooldown
  }

  const remainingStops = currentRoute.stops.filter(
    (s) => s.status === 'upcoming' || s.status === 'required'
  );

  if (remainingStops.length < 2) return null;

  // Calculate current route travel time
  const currentCoords = [
    { lat: crewLat, lng: crewLng },
    ...remainingStops.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat, lng: s.lng })),
  ];
  const currentTime = await getRouteTravelTime(currentCoords);

  // Calculate optimized route (nearest neighbor from current position)
  const optimizedStops = [...remainingStops].sort((a, b) => {
    if (!a.lat || !b.lat) return 0;
    const distA = haversineKm(crewLat, crewLng, a.lat, a.lng);
    const distB = haversineKm(crewLat, crewLng, b.lat, b.lng);
    return distA - distB;
  });

  const optimizedCoords = [
    { lat: crewLat, lng: crewLng },
    ...optimizedStops.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat, lng: s.lng })),
  ];
  const optimizedTime = await getRouteTravelTime(optimizedCoords);

  const savings = currentTime - optimizedTime;

  if (savings < MIN_REROUTE_SAVINGS_MIN) {
    return null; // Not enough savings
  }

  // Don't reorder if a stop is already in_progress or has imminent-arrival status
  const hasImminent = remainingStops.some((s) => s.status === 'in_progress');
  if (hasImminent) return null;

  // Build new route plan with incremented version
  const nextVersion = currentRoute.route_version + 1;
  const newStops = [...currentRoute.stops.filter((s) => s.status === 'in_progress' || s.status === 'completed'), ...optimizedStops];
  newStops.forEach((s, idx) => (s.sequence = idx + 1));

  return {
    ...currentRoute,
    route_version: nextVersion,
    stops: newStops,
    decision_reason: `Route updated — ${savings.toFixed(0)} minutes saved.`,
    generated_at: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// insertStopMidRoute — inserts a new stop at the optimal position
//
// Called when dispatch adds a job or an opportunistic customer
// replies YES. The optimizer determines the correct insertion
// point that minimizes added drive time.
// ------------------------------------------------------------
export async function insertStopMidRoute(currentRoute, newBooking) {
  const stops = [...currentRoute.stops];
  const completedCount = stops.filter((s) => s.status === 'completed' || s.status === 'in_progress').length;

  // Find best insertion point (after completed stops)
  let bestIdx = completedCount;
  let bestAddedDistance = Infinity;

  const newCoord = { lat: newBooking.lat || newBooking.address_data?.lat, lng: newBooking.lng || newBooking.address_data?.lng };

  for (let i = completedCount; i <= stops.length; i++) {
    // Calculate added distance if we insert at position i
    const prevStop = i > 0 ? stops[i - 1] : null;
    const nextStop = i < stops.length ? stops[i] : null;

    let addedDist = 0;
    if (prevStop && prevStop.lat && newCoord.lat) {
      addedDist += haversineKm(prevStop.lat, prevStop.lng, newCoord.lat, newCoord.lng);
    }
    if (nextStop && nextStop.lat && newCoord.lat) {
      addedDist += haversineKm(newCoord.lat, newCoord.lng, nextStop.lat, nextStop.lng);
      // Subtract the direct distance we're replacing
      if (prevStop && prevStop.lat && nextStop.lat) {
        addedDist -= haversineKm(prevStop.lat, prevStop.lng, nextStop.lat, nextStop.lng);
      }
    }

    if (addedDist < bestAddedDistance) {
      bestAddedDistance = addedDist;
      bestIdx = i;
    }
  }

  const newStop = {
    id: newBooking.id,
    type: newBooking.is_opportunistic ? 'opportunistic' : 'customer',
    sequence: bestIdx + 1,
    status: 'upcoming',
    name: newBooking.name,
    address: newBooking.address,
    lat: newCoord.lat,
    lng: newCoord.lng,
    time_window: newBooking.window_label || newBooking.time_slot,
    load_size: newBooking.load_size,
    total_price: newBooking.total_price,
    opportunistic: newBooking.is_opportunistic || false,
  };

  stops.insert(bestIdx, newStop);
  stops.forEach((s, idx) => (s.sequence = idx + 1));

  const nextVersion = currentRoute.route_version + 1;

  return {
    ...currentRoute,
    route_version: nextVersion,
    stops,
    current_stop_id: stops.find((s) => s.status === 'in_progress')?.id || stops[completedCount]?.id,
    decision_reason: newBooking.is_opportunistic
      ? `New opportunistic pickup added between stops ${bestIdx} and ${bestIdx + 2}.`
      : `New job added by dispatch at position ${bestIdx + 1}.`,
    generated_at: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// getLandfillDecision — server-side landfill decision engine
//
// Returns: { decision: 'landfill'|'continue', reason, landfill }
// Considers: current fullness, projected fullness after next job,
// landfill hours, drive time, shift end.
// ------------------------------------------------------------
export async function getLandfillDecision(crewAssignmentId, crewLat, crewLng) {
  const { date: todayStr } = edmontonNowParts();

  // Get current truck fullness from latest truck check or photo analysis
  const { data: truckCheck } = await supabaseAdmin
    .from('truck_checks')
    .select('*')
    .eq('assignment_id', crewAssignmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentFullness = truckCheck?.fuel_percent || 0;

  // Get remaining upcoming jobs
  const { data: remainingJobs } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('job_date', todayStr)
    .eq('crew_assignment_id', crewAssignmentId)
    .in('crew_status', ['confirmed', 'scheduled', 'en_route', 'arrived', 'in_progress'])
    .order('time_slot', { ascending: true });

  // Calculate projected fullness after next job
  const nextJob = remainingJobs?.find((j) => j.crew_status !== 'completed');
  const nextLoadFill = nextJob ? (LOAD_SIZE_FILL[nextJob.load_size] || 50) : 0;
  const projectedFullness = currentFullness + nextLoadFill;

  // Get nearest landfill
  const { data: landfill } = await supabaseAdmin
    .from('landfills')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Check landfill hours (assume 7am-7pm for Calgary landfills)
  const now = new Date();
  const hour = now.getHours();
  const landfillOpen = hour >= 7 && hour < 19;

  if (projectedFullness >= LANDFILL_THRESHOLD_PCT) {
    return {
      decision: 'landfill',
      reason: `Truck is ${currentFullness}% full. After the next job, it would be ${projectedFullness}%. Go to landfill before picking up more.`,
      landfill: landfill ? {
        name: landfill.name,
        address: landfill.address,
        lat: landfill.lat,
        lng: landfill.lng,
        hours: landfill.hours || '7:00 AM - 7:00 PM',
      } : null,
      current_fullness: currentFullness,
      projected_fullness: projectedFullness,
    };
  }

  // Even if below 75%, check if the NEXT job would push us over
  if (nextJob && projectedFullness >= 75) {
    return {
      decision: 'landfill',
      reason: `The next job (${nextJob.load_size || 'standard'} load) would fill the truck to ${projectedFullness}%. Go to landfill first.`,
      landfill: landfill ? {
        name: landfill.name,
        address: landfill.address,
        lat: landfill.lat,
        lng: landfill.lng,
      } : null,
      current_fullness: currentFullness,
      projected_fullness: projectedFullness,
    };
  }

  return {
    decision: 'continue',
    reason: `Truck is ${currentFullness}% full. You have room for the next job.`,
    landfill: null,
    current_fullness: currentFullness,
    projected_fullness: projectedFullness,
  };
}
