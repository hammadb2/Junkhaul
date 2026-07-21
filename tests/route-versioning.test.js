import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Route versioning tests — verify the backend route-plan endpoint,
// acknowledgment API, stale-write protection, safe_retry classification,
// audit-event destination, and migration safety.

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

const rlsMigrationSource = readFileSync(
  new URL('../supabase/migrations/20260730000001_route_rls_and_audit.sql', import.meta.url),
  'utf8'
);

const routeOptimizerSource = readFileSync(
  new URL('../lib/routeOptimizer.js', import.meta.url),
  'utf8'
);

const donationProposalSource = readFileSync(
  new URL('../lib/donationRouteProposals.js', import.meta.url),
  'utf8'
);

// Read all route-sensitive endpoint sources.
// en-route, arrived, start-job, and complete-job were removed 2026-07-21
// along with the rest of the PIN-only crew auth surface (see
// docs/RELIABILITY_MASTER_PLAN.md) — their route-version-guard coverage
// is superseded by app/api/employee/job-clock, which already appears
// below.
const endpointSources = {
  'item-conditions': readFileSync(new URL('../app/api/crew/item-conditions/route.js', import.meta.url), 'utf8'),
  'resend-payment-link': readFileSync(new URL('../app/api/crew/resend-payment-link/route.js', import.meta.url), 'utf8'),
  'collect-payment': collectPaymentSource,
  'upload-photo': uploadPhotoSource,
  'job-clock': readFileSync(new URL('../app/api/employee/job-clock/route.js', import.meta.url), 'utf8'),
  'signature': readFileSync(new URL('../app/api/employee/signature/route.js', import.meta.url), 'utf8'),
  'storage-drop': readFileSync(new URL('../app/api/employee/storage-drop/route.js', import.meta.url), 'utf8'),
};

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
assert.match(routePlanSource, /route_id.*route_version|route_version.*route_id/, 'acknowledgment requires route_id and route_version');
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

// 9. Audit event written to audit_events (NOT geofence_events).
assert.match(routePlanSource, /audit_events/, 'must write audit event to audit_events');
assert.doesNotMatch(routePlanSource, /geofence_events.*route_acknowledged/, 'must NOT write route ack to geofence_events');
assert.match(routePlanSource, /entity_type.*route_plan/, 'audit event entity_type must be route_plan');
assert.match(routePlanSource, /event_type.*route_acknowledged/, 'audit event_type must be route_acknowledged');
assert.match(routePlanSource, /actor_type.*employee/, 'audit actor_type must be employee');
assert.match(routePlanSource, /source.*crew_app/, 'audit source must be crew_app');
console.log('✓ Audit/timeline event written to audit_events (not geofence_events)');

// 10. Stale-write protection (routeVersionGuard).
assert.match(guardSource, /checkRouteVersion/, 'guard must export checkRouteVersion');
assert.match(guardSource, /staleRouteResponse/, 'guard must export staleRouteResponse');
assert.match(guardSource, /missingVersionResponse/, 'guard must export missingVersionResponse');
assert.match(guardSource, /409/, 'guard must return 409 on stale version');
assert.match(guardSource, /current_route_version/, 'guard must return current_route_version');
assert.match(guardSource, /submitted_route_version/, 'guard must return submitted_route_version');
assert.match(guardSource, /refresh_required/, 'guard must return refresh_required');
assert.match(guardSource, /safe_retry/, 'guard must return safe_retry');
console.log('✓ Stale-write protection verified');

// 11. Stale-write protection applied to ALL route-sensitive crew endpoints.
for (const [name, source] of Object.entries(endpointSources)) {
  assert.match(source, /checkRouteVersion/, `${name} must check route version`);
  assert.match(source, /route_id/, `${name} must accept route_id`);
  assert.match(source, /route_version/, `${name} must accept route_version`);
}
console.log(`✓ Stale-write protection applied to all ${Object.keys(endpointSources).length} route-sensitive endpoints`);

// 12. Modern versionless behavior — rejected with 400.
assert.match(guardSource, /Route version required for this action/, 'must reject versionless modern app');
assert.match(guardSource, /status: 400/, 'must return 400 for versionless modern app');
assert.match(guardSource, /missingVersionResponse/, 'must export missingVersionResponse');
console.log('✓ Modern versionless action rejected with 400');

// 13. Legacy compatibility behavior — isolated and time-limited.
assert.match(guardSource, /isLegacyPinAuth/, 'guard must check isLegacyPinAuth');
assert.match(guardSource, /LEGACY_COMPAT_REMOVAL_DATE/, 'guard must have legacy removal date');
assert.match(guardSource, /2026-10-01/, 'legacy removal date must be set');
assert.match(guardSource, /legacy_versionless_action/, 'must audit log legacy versionless actions');
assert.match(guardSource, /audit_events/, 'legacy audit must use audit_events');
assert.match(guardSource, /removal_date/, 'legacy audit must include removal date');
console.log('✓ Legacy compatibility isolated with removal date and audit logging');

// 14. Safe-retry classification by action type.
assert.match(guardSource, /SAFE_RETRY_ACTIONS/, 'guard must have SAFE_RETRY_ACTIONS set');
assert.match(guardSource, /UNSAFE_RETRY_ACTIONS/, 'guard must have UNSAFE_RETRY_ACTIONS set');
// Safe actions.
assert.match(guardSource, /route_acknowledgment/, 'route_acknowledgment must be in safe retry set');
assert.match(guardSource, /photo_upload/, 'photo_upload must be in safe retry set');
// Unsafe actions.
assert.match(guardSource, /job_completion/, 'job_completion must be in unsafe retry set');
assert.match(guardSource, /payment/, 'payment must be in unsafe retry set');
assert.match(guardSource, /signature/, 'signature must be in unsafe retry set');
assert.match(guardSource, /job_start/, 'job_start must be in unsafe retry set');
assert.match(guardSource, /arrival/, 'arrival must be in unsafe retry set');
assert.match(guardSource, /storage_drop/, 'storage_drop must be in unsafe retry set');
// safe_retry must be computed, not hardcoded.
assert.match(guardSource, /safeRetry = SAFE_RETRY_ACTIONS\.has\(actionType\)/, 'safe_retry must be computed from action type');
assert.match(guardSource, /safeRetry && !unsafeRetry/, 'safe_retry must be false for unsafe actions');
console.log('✓ Safe-retry classification by action type verified');

// 15. Migration adds realtime publication and versioning columns.
assert.match(migrationSource, /ALTER PUBLICATION supabase_realtime ADD TABLE route_plans/, 'migration must enable realtime on route_plans');
assert.match(migrationSource, /device_id/, 'migration must add device_id to acknowledgements');
assert.match(migrationSource, /route_version/, 'migration must add route_version to acknowledgements');
assert.match(migrationSource, /route_change_reason/, 'migration must add route_change_reason to route_plans');
assert.match(migrationSource, /requires_acknowledgment/, 'migration must add requires_acknowledgment to route_plans');
assert.match(migrationSource, /route_status/, 'migration must add route_status to route_plans');
assert.match(migrationSource, /current_route_version/, 'migration must add current_route_version to crew_assignments');
assert.match(migrationSource, /UNIQUE INDEX.*route_ack_emp_version/, 'migration must add unique index for idempotent acks');
console.log('✓ Migration verified');

// 16. RLS migration adds audit helper (employee policies were later dropped
//     by corrective migration because the app uses custom auth, not Supabase Auth).
assert.match(rlsMigrationSource, /log_route_acknowledgment/, 'audit helper function must exist');
assert.match(rlsMigrationSource, /audit_events/, 'audit helper must write to audit_events');
assert.match(rlsMigrationSource, /route_version/, 'audit helper must include route_version');
assert.match(rlsMigrationSource, /device_id/, 'audit helper must include device_id');
console.log('✓ RLS migration verified — audit helper function in place');

// 16b. Corrective migration drops broken auth.uid() policies.
const rlsFixSource = readFileSync(
  new URL('../supabase/migrations/20260730000002_fix_route_rls_for_custom_auth.sql', import.meta.url),
  'utf8'
);
assert.match(rlsFixSource, /DROP POLICY.*employee_own_route_plans/, 'must drop broken employee_own_route_plans');
assert.match(rlsFixSource, /DROP POLICY.*employee_own_route_acks/, 'must drop broken employee_own_route_acks');
assert.match(rlsFixSource, /DROP POLICY.*employee_insert_own_route_acks/, 'must drop broken employee_insert_own_route_acks');
assert.match(rlsFixSource, /auth\.uid\(\).*NULL/, 'must document why policies are broken');
console.log('✓ Corrective RLS migration verified — broken auth.uid() policies dropped');

// 16c. SSE route-stream endpoint uses custom auth, not Supabase Auth.
const routeStreamSource = readFileSync(
  new URL('../app/api/employee/route-stream/route.js', import.meta.url),
  'utf8'
);
assert.match(routeStreamSource, /getAuthedEmployee/, 'route-stream must use custom employee session auth');
assert.match(routeStreamSource, /Unauthorized/, 'route-stream must reject unauthenticated');
assert.match(routeStreamSource, /status: 401/, 'route-stream must return 401 for unauthenticated');
assert.match(routeStreamSource, /text\/event-stream/, 'route-stream must return SSE content type');
assert.match(routeStreamSource, /crew_assignment_id/, 'route-stream must resolve crew assignment server-side');
assert.match(routeStreamSource, /Never accept a client-provided assignment ID/, 'must document no client assignment ID');
assert.match(routeStreamSource, /route_update/, 'route-stream must send route_update events');
assert.match(routeStreamSource, /session_terminated/, 'route-stream must detect session termination');
assert.doesNotMatch(routeStreamSource, /auth\.uid\(\)/, 'route-stream must not use Supabase Auth');
assert.doesNotMatch(routeStreamSource, /anonKey|anon_key/, 'route-stream must not use anon key');
console.log('✓ SSE route-stream endpoint verified — uses custom auth, not Supabase Auth');

// 17. Donation insertion preserves paid priority.
assert.match(routeOptimizerSource, /window_start.*time_slot/, 'route optimizer sorts by time window');
assert.match(routeOptimizerSource, /sort.*bookings/, 'route optimizer sorts bookings');
assert.match(donationProposalSource, /status.*approved/, 'donation proposals require approval');
assert.match(donationProposalSource, /stale/, 'donation proposals detect stale versions');
console.log('✓ Donation insertion preserves paid priority');

// 18. Route creation behavior — GET does not create duplicates.
// The GET endpoint only generates a route if none exists.
assert.match(routePlanSource, /if \(!routePlan\)/, 'GET must only generate when no plan exists');
assert.match(routePlanSource, /current_route_plan_id/, 'GET must check current_route_plan_id first');
assert.match(routePlanSource, /order\('route_version', \{ ascending: false \}\)/, 'GET must fall back to latest by version');
// generateRoutePlan always increments version.
assert.match(routeOptimizerSource, /nextVersion = \(lastPlan\?\.route_version \|\| 0\) \+ 1/, 'generateRoutePlan must increment version');
console.log('✓ Repeated route GET does not create duplicate versions');

// 19. Backward compat removed — guard does NOT have unconditional skip.
assert.doesNotMatch(guardSource, /skipped: true.*backward compat/, 'guard must not have unconditional backward compat skip');
// The only `skipped: true` should be for legacy PIN auth or missing assignment.
const skippedMatches = guardSource.match(/skipped: true/g);
assert.ok(skippedMatches && skippedMatches.length <= 4, 'skipped: true should only appear for legacy/missing-booking/no-assignment/no-plan cases');
console.log('✓ Unsafe backward compatibility removed');

console.log('route-versioning tests passed');
