import { geocodeAddress } from './geocode';

// ============================================================
// ROUTE OPTIMISER — Mapbox Directions API + Optimization API.
// Uses real Calgary driving distances for accurate route ordering.
// Falls back to nearest-neighbour with haversine if API fails.
// ============================================================
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;

// U-Haul pickup depot: 2615 12 St NE Calgary.
const DEPOT = { lat: 51.0595, lng: -114.0447 };

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
