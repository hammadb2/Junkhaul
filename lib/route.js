import { geocodeAddress } from './geocode';

// ============================================================
// ROUTE OPTIMISER — free OSM stack (OSRM table service).
// Replaces Google Routes API. Nearest-neighbour from the U-Haul depot.
// ============================================================
const OSRM = process.env.OSRM_URL || 'https://router.project-osrm.org';

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

  // Build coordinate list: depot first, then each booking.
  const coords = [DEPOT, ...geolocated.map((b) => ({ lat: b.lat, lng: b.lng }))];
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');

  let durations = null;
  try {
    const url = `${OSRM}/table/v1/driving/${coordStr}?annotations=duration`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok') durations = data.durations;
  } catch (err) {
    console.error('OSRM route failed:', err);
  }

  // Fallback: straight-line (haversine) distances if OSRM is unavailable.
  const cost = (i, j) => {
    if (durations) return durations[i][j];
    const a = coords[i];
    const b = coords[j];
    const dLat = (b.lat - a.lat) * 111;
    const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  // Nearest-neighbour starting at the depot (index 0).
  const visited = new Set();
  const order = [];
  let current = 0;
  while (order.length < geolocated.length) {
    let nearest = null;
    let nearestCost = Infinity;
    for (let i = 0; i < geolocated.length; i++) {
      if (visited.has(i)) continue;
      const c = cost(current, i + 1); // +1 offset for depot
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
  // Append any un-geocodable jobs at the end so nothing is dropped.
  return [...ordered, ...ungeocoded];
};
