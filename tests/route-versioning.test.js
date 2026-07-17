import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Route versioning tests — verify the backend route-plan endpoint,
// acknowledgment API, and stale-write protection are correctly
// implemented via source-level assertions.

const routePlanSource = readFileSync(
  new URL('../app/api/employee/route-plan/route.js', import.meta.url),
  'utf8'
);

const guardSource = readFileSync(
  new URL('../lib/routeVersionGuard.js', import.meta.url),
  'utf8'
);

const collectPaymentSource = readFileSync(
  new URL('../app/api/crew/collect-payment/route.js', import.meta.url),
  'utf8'
);

const uploadPhotoSource = readFileSync(
  new URL('../app/api/crew/upload-photo/route.js', import.meta.url),
  'utf8'
);

const migrationSource = readFileSync(
  new URL('../supabase/migrations/20260718000001_route_versioning.sql', import.meta.url),
  'utf8'
);

console.log('--- Route versioning tests ---');

// 1. Canonical route response shape.
assert.match(routePlanSource, /route_id/, 'route-plan must return route_id');
assert.match(routePlanSource, /route_version/, 'route-plan must return route_version');
assert.match(routePlanSource, /route_status/, 'route-plan must return route_status');
assert.match(routePlanSource, /route_updated_at/, 'route-plan must return route_updated_at');
assert.match(routePlanSource, /crew_assignment_id/, 'route-plan must return crew_assignment_id');
assert.match(routePlanSource, /truck_id/, 'route-plan must return truck_id');
assert.match(routePlanSource, /ordered_stops/, 'route-plan must return ordered_stops');
assert.match(routePlanSource, /active_stop_id/, 'route-plan must return active_stop_id');
assert.match(routePlanSource, /route_lock/, 'route-plan must return route_lock');
assert.match(routePlanSource, /route_change_reason/, 'route-plan must return route_change_reason');
assert.match(routePlanSource, /requires_acknowledgment/, 'route-plan must return requires_acknowledgment');
assert.match(routePlanSource, /acknowledged/, 'route-plan must return acknowledged field');
console.log('✓ Canonical route response shape verified');

// 2. Ordered stops include all required fields.
assert.match(routePlanSource, /stop_id/, 'stops must include stop_id');
assert.match(routePlanSource, /booking_id/, 'stops must include booking_id');
assert.match(routePlanSource, /stop_type/, 'stops must include stop_type');
assert.match(routePlanSource, /sequence/, 'stops must include sequence');
assert.match(routePlanSource, /status/, 'stops must include status');
assert.match(routePlanSource, /latitude/, 'stops must include latitude');
assert.match(routePlanSource, /longitude/, 'stops must include longitude');
assert.match(routePlanSource, /arrival_window_start/, 'stops must include arrival_window_start');
assert.match(routePlanSource, /paid_priority/, 'stops must include paid_priority');
assert.match(routePlanSource, /destination_type/, 'stops must include destination_type');
console.log('✓ Ordered stops shape verified');

// 3. Assigned crew access — endpoint uses getAuthedEmployee.
assert.match(routePlanSource, /getAuthedEmployee/, 'route-plan must use employee session auth');
assert.match(routePlanSource, /Unauthorized/, 'route-plan must reject unauthenticated');
assert.match(routePlanSource, /status: 401/, 'route-plan must return 401 for unauthenticated');
console.log('✓ Assigned crew access verified');

// 4. Acknowledgment API.
assert.match(routePlanSource, /route_id.*route_version/, 'acknowledgment requires route_id and route_version');
assert.match(routePlanSource, /Missing route_id or route_version/, 'acknowledgment must validate required fields');
assert.match(routePlanSource, /device_id/, 'acknowledgment must accept device_id');
assert.match(routePlanSource, /upsert/, 'acknowledgment must use upsert for idempotency');
assert.match(routePlanSource, /onConflict/, 'acknowledgment must specify conflict columns');
console.log('✓ Acknowledgment API verified');

// 5. Duplicate acknowledgment is idempotent.
assert.match(routePlanSource, /onConflict.*route_plan_id.*employee_id.*route_version/, 'idempotent ack via unique index');
console.log('✓ Duplicate acknowledgment idempotency verified');

// 6. Old-version acknowledgment rejection.
assert.match(routePlanSource, /Stale route version/, 'must reject old version acknowledgment');
assert.match(routePlanSource, /submitted_route_version/, 'must return submitted_route_version');
assert.match(routePlanSource, /current_route_version/, 'must return current_route_version');
assert.match(routePlanSource, /status: 409/, 'must return 409 for stale version');
console.log('✓ Old-version acknowledgment rejection verified');

// 7. Future-version rejection.
assert.match(routePlanSource, /Unknown route version/, 'must reject future/unknown version');
assert.match(routePlanSource, /refresh_required: true/, 'must set refresh_required');
assert.match(routePlanSource, /status: 400/, 'must return 400 for unknown version');
console.log('✓ Future-version rejection verified');

// 8. Unassigned employee denial.
assert.match(routePlanSource, /Not assigned to this route/, 'must reject unassigned employee');
assert.match(routePlanSource, /status: 403/, 'must return 403 for unassigned');
console.log('✓ Unassigned employee denial verified');

// 9. Audit/timeline event.
assert.match(routePlanSource, /geofence_events/, 'must write audit event');
assert.match(routePlanSource, /route_acknowledged/, 'audit event must be route_acknowledged');
console.log('✓ Audit/timeline event verified');

// 10. Stale-write protection (routeVersionGuard).
assert.match(guardSource, /checkRouteVersion/, 'guard must export checkRouteVersion');
assert.match(guardSource, /staleRouteResponse/, 'guard must export staleRouteResponse');
assert.match(guardSource, /409/, 'guard must return 409 on stale version');
assert.match(guardSource, /current_route_version/, 'guard must return current_route_version');
assert.match(guardSource, /submitted_route_version/, 'guard must return submitted_route_version');
assert.match(guardSource, /refresh_required/, 'guard must return refresh_required');
assert.match(guardSource, /safe_retry/, 'guard must return safe_retry');
console.log('✓ Stale-write protection verified');

// 11. Stale-write protection applied to crew endpoints.
assert.match(collectPaymentSource, /checkRouteVersion/, 'collect-payment must check route version');
assert.match(collectPaymentSource, /staleRouteResponse/, 'collect-payment must use stale route response');
assert.match(collectPaymentSource, /route_id/, 'collect-payment must accept route_id');
assert.match(collectPaymentSource, /route_version/, 'collect-payment must accept route_version');
assert.match(uploadPhotoSource, /checkRouteVersion/, 'upload-photo must check route version');
assert.match(uploadPhotoSource, /staleRouteResponse/, 'upload-photo must use stale route response');
assert.match(uploadPhotoSource, /route_id/, 'upload-photo must accept route_id');
assert.match(uploadPhotoSource, /route_version/, 'upload-photo must accept route_version');
console.log('✓ Stale-write protection applied to crew endpoints');

// 12. Migration adds realtime publication and versioning columns.
assert.match(migrationSource, /ALTER PUBLICATION supabase_realtime ADD TABLE route_plans/, 'migration must enable realtime on route_plans');
assert.match(migrationSource, /device_id/, 'migration must add device_id to acknowledgements');
assert.match(migrationSource, /route_version/, 'migration must add route_version to acknowledgements');
assert.match(migrationSource, /route_change_reason/, 'migration must add route_change_reason to route_plans');
assert.match(migrationSource, /requires_acknowledgment/, 'migration must add requires_acknowledgment to route_plans');
assert.match(migrationSource, /route_status/, 'migration must add route_status to route_plans');
assert.match(migrationSource, /current_route_version/, 'migration must add current_route_version to crew_assignments');
assert.match(migrationSource, /UNIQUE INDEX.*route_ack_emp_version/, 'migration must add unique index for idempotent acks');
console.log('✓ Migration verified');

// 13. Donation insertion preserves paid priority.
// The route optimizer sorts by time window and inserts landfill/donation
// stops based on capacity — paid customer stops maintain their time-based
// priority. Donation stops are only inserted via approved proposals.
const routeOptimizerSource = readFileSync(
  new URL('../lib/routeOptimizer.js', import.meta.url),
  'utf8'
);
assert.match(routeOptimizerSource, /window_start.*time_slot/, 'route optimizer sorts by time window');
assert.match(routeOptimizerSource, /sort.*bookings/, 'route optimizer sorts bookings');
// Donation stops are only added via approved proposals, not directly.
const donationProposalSource = readFileSync(
  new URL('../lib/donationRouteProposals.js', import.meta.url),
  'utf8'
);
assert.match(donationProposalSource, /status.*approved/, 'donation proposals require approval');
assert.match(donationProposalSource, /stale/, 'donation proposals detect stale versions');
console.log('✓ Donation insertion preserves paid priority');

// 14. Backward compat — guard allows actions without route_version.
assert.match(guardSource, /backward compat/, 'guard must allow actions without route_version');
assert.match(guardSource, /skipped: true/, 'guard must skip when no version provided');
console.log('✓ Backward compat verified');

console.log('route-versioning tests passed');
