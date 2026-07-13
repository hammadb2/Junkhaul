import { geocodeAddress } from './geocode';
import { TRAVEL_FEE_PICKUP, TRAVEL_FEE_HOME, TRAVEL_FEE_PER_KM } from './pricingConstants';

// ============================================================
// ROUTE OPTIMISER — Mapbox Directions API + Optimization API.
// Uses real Calgary driving distances for accurate route ordering.
// Falls back to nearest-neighbour with haversine if API fails.
// ============================================================
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;

// U-Haul pickup depot: Gas Plus, 100 Main Street, Balzac, AB.
const DEPOT = { lat: 51.2128, lng: -114.0081 };

// Ensure every booking has coordinates (geocode any that are missing).
const withCoords = async (bookings) => {
  return Promise.all(
    bookings.map(async (b) => {
      if (typeof b.lat === 'number' && typeof b.lng === 'number') return b;
      const geo = await geocodeAddress(b.address);
      return { ...b, lat: geo.lat, lng: geo.lng };
    })
  );
};

// Haversine distance in km (fallback)
const haversine = (a, b) => {
  const dLat = (b.lat - a.lat) * 111;
  const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

export const optimiseRoute = async (bookings) => {
  if (!bookings || bookings.length <= 1) return bookings || [];

  const located = await withCoords(bookings);
  const geolocated = located.filter(
    (b) => typeof b.lat === 'number' && typeof b.lng === 'number'
  );
  const ungeocoded = located.filter(
    (b) => typeof b.lat !== 'number' || typeof b.lng !== 'number'
  );

  if (geolocated.length <= 1) return located;

  // Try Mapbox Optimization API for up to 12 stops (Mapbox limit)
  // Format: depot;stop1;stop2;...;depot (round trip)
  if (MAPBOX_TOKEN && geolocated.length <= 12) {
    try {
      const coords = [
        `${DEPOT.lng},${DEPOT.lat}`,
        ...geolocated.map((b) => `${b.lng},${b.lat}`),
        `${DEPOT.lng},${DEPOT.lat}`, // return to depot
      ].join(';');

      const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?access_token=${MAPBOX_TOKEN}&roundtrip=true&source=first&destination=last&overview=full&steps=true&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.trips?.[0]) {
        // Mapbox returns the optimized order in the waypoints
        // The first and last waypoints are the depot
        const orderedIndices = data.waypoints
          .slice(1, -1) // remove depot at start and end
          .map((wp) => {
            // Find the matching booking by coordinates
            const idx = geolocated.findIndex(
              (b) =>
                Math.abs(b.lng - wp.location[0]) < 0.0001 &&
                Math.abs(b.lat - wp.location[1]) < 0.0001
            );
            return idx;
          })
          .filter((i) => i >= 0);

        const ordered = orderedIndices.map((i) => geolocated[i]);
        // Add any that didn't match at the end
        const missing = geolocated.filter((_, i) => !orderedIndices.includes(i));
        return [...ordered, ...missing, ...ungeocoded];
      }
    } catch (err) {
      console.error('Mapbox optimization failed, falling back:', err);
    }
  }

  // Fallback: Mapbox Directions matrix (durations) for > 12 stops
  // or if optimization API failed
  if (MAPBOX_TOKEN) {
    try {
      const coords = [DEPOT, ...geolocated.map((b) => ({ lat: b.lat, lng: b.lng }))];
      const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
      const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordStr}?access_token=${MAPBOX_TOKEN}&annotations=duration,distance`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.durations) {
        const durations = data.durations;
        // Nearest-neighbour starting at the depot (index 0)
        const visited = new Set();
        const order = [];
        let current = 0;
        while (order.length < geolocated.length) {
          let nearest = null;
          let nearestCost = Infinity;
          for (let i = 0; i < geolocated.length; i++) {
            if (visited.has(i)) continue;
            const c = durations[current][i + 1];
            if (c < nearestCost) {
              nearestCost = c;
              nearest = i;
            }
          }
          if (nearest === null) break;
          visited.add(nearest);
          order.push(nearest);
          current = nearest + 1;
        }
        const ordered = order.map((i) => geolocated[i]);
        return [...ordered, ...ungeocoded];
      }
    } catch (err) {
      console.error('Mapbox matrix failed, falling back to haversine:', err);
    }
  }

  // Final fallback: nearest-neighbour with haversine distance
  const coords = [DEPOT, ...geolocated.map((b) => ({ lat: b.lat, lng: b.lng }))];
  const cost = (i, j) => haversine(coords[i], coords[j]);

  const visited = new Set();
  const order = [];
  let current = 0;
  while (order.length < geolocated.length) {
    let nearest = null;
    let nearestCost = Infinity;
    for (let i = 0; i < geolocated.length; i++) {
      if (visited.has(i)) continue;
      const c = cost(current, i + 1);
      if (c < nearestCost) {
        nearestCost = c;
        nearest = i;
      }
    }
    if (nearest === null) break;
    visited.add(nearest);
    order.push(nearest);
    current = nearest + 1;
  }

  const ordered = order.map((i) => geolocated[i]);
  return [...ordered, ...ungeocoded];
};

// ============================================================
// TRAVEL FEE CALCULATION — customer-facing.
// Route: our home → U-Haul pickup (Balzac) → customer address.
// Both legs charged at TRAVEL_FEE_PER_KM ($1.50/km).
// Uses Mapbox Directions API for real driving distance, falls
// back to haversine if the API is unavailable.
// ============================================================

// Haversine distance in km between two {lat,lng} points.
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Get driving distance in km between two coordinates via Mapbox Directions.
const drivingDistanceKm = async (from, to) => {
  if (!MAPBOX_TOKEN) return haversineKm(from, to);
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${MAPBOX_TOKEN}&overview=full`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.distance) {
      return data.routes[0].distance / 1000; // metres → km
    }
  } catch (err) {
    console.error('Mapbox directions failed, using haversine:', err.message);
  }
  return haversineKm(from, to);
};

// Calculate the customer-facing travel fee.
// customerCoords: { lat, lng } — geocoded customer address.
// Returns { km, fee, legs: { home_to_uhaul, uhaul_to_customer } }.
export const calculateTravelFee = async (customerCoords) => {
  if (!customerCoords || typeof customerCoords.lat !== 'number') {
    return { km: 0, fee: 0, legs: { home_to_uhaul: 0, uhaul_to_customer: 0 } };
  }

  const leg1 = await drivingDistanceKm(TRAVEL_FEE_HOME, TRAVEL_FEE_PICKUP);
  const leg2 = await drivingDistanceKm(TRAVEL_FEE_PICKUP, customerCoords);
  const totalKm = Math.round((leg1 + leg2) * 10) / 10; // round to 0.1 km
  const fee = Math.round(totalKm * TRAVEL_FEE_PER_KM);

  return {
    km: totalKm,
    fee,
    legs: { home_to_uhaul: Math.round(leg1 * 10) / 10, uhaul_to_customer: Math.round(leg2 * 10) / 10 },
  };
};
