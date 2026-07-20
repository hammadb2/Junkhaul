import assert from 'node:assert/strict';
import { loadProfile, haversineKm, facilityOpenAt, insertStopMidRoute, HOME, DEPOT, DEFAULT_LANDFILL } from '../lib/routeEngine.js';

// loadProfile uses AI weight when present.
const ai = loadProfile('half', 650);
assert.equal(ai.weight_kg, 650, 'AI weight estimate is respected');
assert.equal(ai.volume_pct, 50, 'volume percent still uses load size');

const fallback = loadProfile('full', 0);
assert.equal(fallback.weight_kg, 1000, 'fallback weight for full load');
assert.equal(fallback.volume_pct, 100, 'full load volume is 100%');

// haversine sanity: home to depot should be > 0 and reasonable.
const d = haversineKm(HOME, DEPOT);
assert.ok(d > 5 && d < 50, `home->depot distance ${d} km is within Calgary/Balzac range`);

// facilityOpenAt
const morning = new Date('2026-07-20T08:00:00-06:00');
assert.equal(facilityOpenAt(DEFAULT_LANDFILL, morning), true, 'landfill open at 8am');
const night = new Date('2026-07-20T20:00:00-06:00');
assert.equal(facilityOpenAt(DEFAULT_LANDFILL, night), false, 'landfill closed at 8pm');

// insertStopMidRoute places a stop to minimize added distance.
const currentRoute = {
  route_version: 1,
  stops: [
    { ...DEPOT, sequence: 1, status: 'completed', type: 'depot' },
    { id: 'job1', name: 'A', lat: 51.05, lng: -114.05, status: 'in_progress', type: 'customer' },
    { id: 'job2', name: 'B', lat: 51.15, lng: -114.10, status: 'upcoming', type: 'customer' },
    { id: 'job3', name: 'C', lat: 51.20, lng: -114.00, status: 'upcoming', type: 'customer' },
  ],
};
const newBooking = { id: 'new', name: 'D', lat: 51.16, lng: -114.09, load_size: 'quarter', total_price: 200 };
const updated = insertStopMidRoute(currentRoute, newBooking);
assert.equal(updated.stops.length, 5, 'new stop inserted');
assert.equal(updated.stops[0].id, 'depot', 'completed stops preserved');
assert.equal(updated.stops[1].id, 'job1', 'in_progress job preserved');
const upcomingIds = updated.stops.slice(2).map((s) => s.id);
assert.ok(upcomingIds.includes('new'), 'new booking appears in upcoming section');
assert.ok(updated.stops.every((s, i) => s.sequence === i + 1), 'sequences are renumbered');
assert.equal(updated.route_status, 'proposed', 'new plan is a proposal');

console.log('routeEngine tests passed');
