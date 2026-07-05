// ============================================================
// Geocoding via Nominatim (OpenStreetMap) — free, no API key.
// Respect usage policy: send a descriptive User-Agent, keep volume low.
// ============================================================
const NOMINATIM = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const UA = 'JunkHaulCalgary/1.0 (https://junkhaul.ca)';

// Calgary quadrant origin (Centre St / Centre Ave area, downtown).
const ORIGIN = { lat: 51.0486, lng: -114.0626 };

export const deriveQuadrant = ({ address, lat, lng }) => {
  // Prefer an explicit quadrant token in the address (Calgary addresses carry it).
  if (address) {
    const m = address.toUpperCase().match(/\b(NW|NE|SW|SE)\b/);
    if (m) return m[1];
  }
  if (typeof lat === 'number' && typeof lng === 'number') {
    const ns = lat >= ORIGIN.lat ? 'N' : 'S';
    const ew = lng >= ORIGIN.lng ? 'E' : 'W';
    return `${ns}${ew}`;
  }
  return null;
};

export const geocodeAddress = async (address) => {
  const q = `${address}, Calgary, AB, Canada`;
  const url = `${NOMINATIM}/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { lat: null, lng: null, quadrant: deriveQuadrant({ address }) };
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { lat: null, lng: null, quadrant: deriveQuadrant({ address }) };
    }
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    return { lat, lng, quadrant: deriveQuadrant({ address, lat, lng }) };
  } catch (err) {
    console.error('Geocode failed:', err);
    return { lat: null, lng: null, quadrant: deriveQuadrant({ address }) };
  }
};
