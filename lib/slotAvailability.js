import { supabaseAdmin } from './supabase';
import { getNumberConfig, getStringConfig } from './config';

// ============================================================
// lib/slotAvailability.js
//
// Determines which arrival windows are available for a given
// date, respecting landfill closing times and on-site duration.
//
// The flow:
//   1. For each candidate window (Morning / Afternoon), get the
//      latest possible arrival time = window_end.
//   2. Compute: drive_time(depot → job) + on-site duration
//      + drive_time(job → nearest valid landfill) + unload buffer.
//   3. If that total pushes past landfill close (4 PM), the
//      window is hidden — the crew can't finish before closing.
//   4. The check runs per-window, not per-exact-time.
// ============================================================

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;

// U-Haul pickup depot: Gas Plus, 100 Main Street, Balzac, AB.
const DEPOT = { lat: 51.2128, lng: -114.0081 };

// On-site duration per load size (minutes), with config overrides.
const ONSITE_DURATIONS = {
  single_item: 20,
  quarter: 40,
  half: 60,
  full: 90,
};

// Landfill unload buffer (minutes before closing).
const DEFAULT_UNLOAD_BUFFER = 30;

// ---------------------------------------------------------------
// Get valid landfills for a given date (respects seasonal Sunday rule)
// ---------------------------------------------------------------
export async function getValidLandfillsForDate(dateStr) {
  const { data: landfills, error } = await supabaseAdmin
    .from('landfills')
    .select('*')
    .order('name');
  if (error) return [];

  const date = new Date(`${dateStr}T12:00:00Z`);
  const dow = date.getUTCDay(); // 0=Sunday
  const month = date.getUTCMonth() + 1; // 1-12
  const isWinter = month >= 11 || month <= 3; // Nov-Mar
  const isSunday = dow === 0;
  const isWeekday = dow >= 1 && dow <= 5;

  return (landfills || []).filter((l) => {
    if (isSunday) {
      if (!l.sunday_open) return false;
      if (l.summer_only_sunday && isWinter) return false;
      return true;
    }
    if (isWeekday) return l.monday_to_friday !== false;
    // Saturday — all landfills open
    return true;
  });
}

// ---------------------------------------------------------------
// Get the on-site duration for a load size (from config or default)
// ---------------------------------------------------------------
export async function getOnsiteDuration(loadSize) {
  const key = `onsite_duration_${loadSize}`;
  const configVal = await getNumberConfig(key);
  return configVal || ONSITE_DURATIONS[loadSize] || 60;
}

// ---------------------------------------------------------------
// Get the landfill unload buffer (minutes before closing)
// ---------------------------------------------------------------
export async function getUnloadBuffer() {
  return (await getNumberConfig('landfill_unload_buffer_minutes')) || DEFAULT_UNLOAD_BUFFER;
}

// ---------------------------------------------------------------
// Get driving time in minutes between two coordinates via Mapbox.
// Falls back to haversine estimate if Mapbox is unavailable.
// ---------------------------------------------------------------
export async function drivingTimeMinutes(from, to) {
  if (!MAPBOX_TOKEN) {
    // Haversine fallback: ~50 km/h average city speed
    const km = haversineKm(from, to);
    return Math.round((km / 50) * 60);
  }
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.duration) {
      return Math.round(data.routes[0].duration / 60); // seconds → minutes
    }
  } catch (err) {
    console.error('[slotAvailability] Mapbox directions failed:', err.message);
  }
  // Haversine fallback
  const km = haversineKm(from, to);
  return Math.round((km / 50) * 60);
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ---------------------------------------------------------------
// Geocode an address to lat/lng via Mapbox.
// Returns null if geocoding fails.
// ---------------------------------------------------------------
export async function geocodeAddress(address) {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=ca&proximity=-114.0719,51.0447&bbox=-114.3,50.9,-113.9,51.2&types=address&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]?.center) {
      return { lat: data.features[0].center[1], lng: data.features[0].center[0] };
    }
  } catch (err) {
    console.error('[slotAvailability] Geocoding failed:', err.message);
  }
  return null;
}

// ---------------------------------------------------------------
// Check if a window is feasible given landfill closing constraints.
//
// Returns true if the crew can:
//   drive depot → job + do the job + drive job → landfill + unload
//   all before the landfill closes.
//
// If we can't geocode the address (no Mapbox token, bad address),
// we default to showing the window — better to offer and adjust
// later than to block all bookings.
// ---------------------------------------------------------------
export async function isWindowFeasible({
  dateStr,
  windowEnd,        // 'HH:MM' — latest arrival time in the window
  loadSize,
  jobAddress,
  jobCoords,        // optional: { lat, lng } if already geocoded
}) {
  const landfills = await getValidLandfillsForDate(dateStr);

  // If no landfills are open that day, no window is feasible.
  // (e.g. Sunday in winter when all landfills are closed)
  if (landfills.length === 0) return false;

  // All Calgary landfills close at 4 PM (16:00).
  // Use the earliest close time among valid landfills to be safe.
  const earliestClose = landfills.reduce((earliest, l) => {
    const close = l.close_time || '16:00';
    return close < earliest ? close : earliest;
  }, '23:59');

  const landfillCloseMinutes = timeToMinutes(earliestClose);
  const windowEndMinutes = timeToMinutes(windowEnd);
  const unloadBuffer = await getUnloadBuffer();
  const onsiteDuration = await getOnsiteDuration(loadSize);

  // Get job coordinates
  let coords = jobCoords;
  if (!coords && jobAddress) {
    coords = await geocodeAddress(jobAddress);
  }
  // If we can't geocode, allow the window — we'll adjust day-of.
  if (!coords) return true;

  // Find nearest valid landfill by driving time
  let minDriveToLandfill = null;
  for (const landfill of landfills) {
    if (!landfill.lat || !landfill.lng) continue;
    const driveMin = await drivingTimeMinutes(coords, { lat: landfill.lat, lng: landfill.lng });
    if (minDriveToLandfill === null || driveMin < minDriveToLandfill) {
      minDriveToLandfill = driveMin;
    }
  }
  // If no landfill has coordinates, allow the window.
  if (minDriveToLandfill === null) return true;

  // Drive time from depot to job
  const driveDepotToJob = await drivingTimeMinutes(DEPOT, coords);

  // Total time from window_end arrival to landfill unload complete:
  //   on-site duration + drive to landfill + unload buffer
  const totalAfterArrival = onsiteDuration + minDriveToLandfill + unloadBuffer;

  // Latest arrival that still makes landfill closing:
  //   landfillClose - totalAfterArrival
  const latestArrival = landfillCloseMinutes - totalAfterArrival;

  // The window is feasible if the window_end is early enough that
  // even the last job in the window can still make the landfill.
  // We also need drive time from depot to the job — the crew starts
  // from the depot, so the earliest they can arrive is depot drive time.
  // If the window starts before the crew can even get there, that's fine —
  // they just arrive when they can. The constraint is the END of the window.
  const feasible = windowEndMinutes <= latestArrival;

  // Also check: can the crew even get to the job from the depot within
  // the window? If depot→job drive time exceeds the window duration,
  // the window is too tight. But this is a soft constraint — the crew
  // can start before the window opens. So we only hard-check the landfill.

  return feasible;
}

// ---------------------------------------------------------------
// Helper: 'HH:MM' → minutes since midnight
// ---------------------------------------------------------------
export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}
