import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Disposable/local Supabase integration environment only — same gating
// contract as tests/integration/foundation.integration.js. Exercises the
// donation intelligence & route-fit backend end to end against a running
// app instance (TEST_APP_BASE_URL) plus direct DB seeding/verification.

const dbUrl = process.env.TEST_SUPABASE_DB_URL || process.env.TEST_DATABASE_URL;
const supabaseUrl = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const appBaseUrl = process.env.TEST_APP_BASE_URL;
const testEnvironment = process.env.TEST_ENVIRONMENT;
const testProjectRef = process.env.TEST_PROJECT_REF;
const approvedProjectRef = process.env.APPROVED_TEST_PROJECT_REF;
const allowReset = process.env.ALLOW_TEST_DATABASE_RESET === 'true';
const allowRemote = process.env.ALLOW_REMOTE_TEST_DATABASE === 'true';
const allowApprovedProjectCredentials = process.env.ALLOW_APPROVED_PROJECT_CREDENTIALS === 'true';

function notRun(message) {
  console.error(JSON.stringify({
    ok: false,
    status: 'NOT_RUN',
    reason: message,
    required_env: [
      'TEST_ENVIRONMENT=staging|local',
      'TEST_PROJECT_REF and APPROVED_TEST_PROJECT_REF with matching non-production project ref',
      'TEST_SUPABASE_URL',
      'TEST_SUPABASE_SERVICE_ROLE_KEY',
      'TEST_APP_BASE_URL',
      'ALLOW_TEST_DATABASE_RESET=true',
      'ALLOW_REMOTE_TEST_DATABASE=true for remote disposable Supabase only',
    ],
  }, null, 2));
  process.exit(2);
}

if (!dbUrl && !supabaseUrl && !serviceKey && !appBaseUrl) {
  notRun('No staging/local Supabase integration environment was provided.');
}

const denyFragments = ['mvsopvphpuucrbuqsfky', 'aws-0-us-east-1.pooler.supabase.com'];
for (const value of [dbUrl, supabaseUrl, testProjectRef, approvedProjectRef].filter(Boolean)) {
  if (!allowApprovedProjectCredentials && denyFragments.some((fragment) => String(value).includes(fragment))) {
    throw new Error('Refusing to run integration tests against known production Supabase identifiers.');
  }
}

assert.ok(['staging', 'local'].includes(testEnvironment), 'TEST_ENVIRONMENT must be staging or local.');
assert.ok(testProjectRef && approvedProjectRef && testProjectRef === approvedProjectRef, 'TEST_PROJECT_REF must match APPROVED_TEST_PROJECT_REF.');
assert.equal(allowReset, true, 'ALLOW_TEST_DATABASE_RESET=true is required for integration tests.');
assert.ok(supabaseUrl, 'TEST_SUPABASE_URL is required.');
assert.ok(serviceKey, 'TEST_SUPABASE_SERVICE_ROLE_KEY is required.');
assert.ok(appBaseUrl, 'TEST_APP_BASE_URL is required for route-level integration tests.');
if (/supabase\.(co|com)/i.test(supabaseUrl) && !allowRemote) {
  throw new Error('Remote Supabase integration tests require ALLOW_REMOTE_TEST_DATABASE=true and a disposable/staging project.');
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function psql(args, input = null) {
  if (!dbUrl) return null;
  const result = spawnSync('psql', [dbUrl, ...args], { input, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`psql failed (${args.join(' ')}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

const runId = `dit_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
const headers = { 'content-type': 'application/json' };

async function appFetch(path, options = {}) {
  const res = await fetch(`${appBaseUrl.replace(/\/$/, '')}${path}`, { redirect: 'manual', ...options, headers: { ...(options.headers || {}) } });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { res, text, json };
}

const ownerSession = `${runId}_owner`;
const adminSession = `${runId}_admin`;
const managerSession = `${runId}_manager`;
const employeeSession = `${runId}_employee`;
const cookieFor = (token) => ({ cookie: `jh_employee_session=${token}` });

let seeded = {};

async function cleanup() {
  try {
    if (seeded.donationRequestId) {
      await supabase.from('donation_route_proposals').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('donation_route_matches').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('donation_destination_scores').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('donation_capacity_estimates').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('donation_ai_analyses').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('donation_request_items').delete().eq('donation_request_id', seeded.donationRequestId);
      await supabase.from('timeline_events').delete().eq('entity_type', 'donation_request').eq('entity_id', seeded.donationRequestId);
      await supabase.from('audit_events').delete().eq('entity_type', 'donation_request').eq('entity_id', seeded.donationRequestId);
      await supabase.from('audit_events').delete().eq('entity_type', 'donation_route_proposal');
      await supabase.from('donation_requests').delete().eq('id', seeded.donationRequestId);
    }
    if (seeded.routePlanIds?.length) await supabase.from('route_plans').delete().in('id', seeded.routePlanIds);
    if (seeded.crewAssignmentId) await supabase.from('crew_assignments').delete().eq('id', seeded.crewAssignmentId);
    if (seeded.donationCenterId) await supabase.from('donation_centers').delete().eq('id', seeded.donationCenterId);
    if (seeded.storageFacilityId) await supabase.from('storage_facilities').delete().eq('id', seeded.storageFacilityId);
    if (seeded.policyId) await supabase.from('donation_policy_versions').delete().eq('id', seeded.policyId);
    await supabase.from('employee_sessions').delete().in('token', [ownerSession, adminSession, managerSession, employeeSession]);
    await supabase.from('employees').delete().like('email', `${runId}%@example.test`);
    await supabase.from('manager_scopes').delete().like('reason', `${runId}%`);
  } catch (e) {
    console.error('cleanup warning:', e.message);
  }
}

await cleanup();

try {
  // ---------- Schema sanity ----------
  const requiredTables = [
    'donation_photo_sufficiency', 'donation_capacity_estimates', 'donation_destination_scores',
    'donation_route_proposals',
  ];
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    assert.equal(error, null, `Missing/inaccessible table ${table}: ${error?.message}`);
  }
  if (dbUrl) {
    const exists = psql(['-Atc', "select exists (select 1 from information_schema.columns where table_name='donation_route_matches' and column_name='decision')"]).trim();
    assert.equal(exists, 't', 'donation_route_matches.decision column missing');
  }

  // ---------- Seed a donation request ready for route-fit ----------
  const { data: policy } = await supabase.from('donation_policy_versions').insert({
    version: `${runId}-policy`, active: false, accepted_categories: ['furniture'], prohibited_categories: [], minimum_condition: 'good',
  }).select().single();
  seeded.policyId = policy.id;

  const { data: donationCenter } = await supabase.from('donation_centers').insert({
    name: `${runId} center`, address: '123 Test St', lat: 51.05, lng: -114.07, is_active: true,
    destination_type: 'donation_centre', accepted_categories: ['furniture'], operating_hours: {},
  }).select().single();
  seeded.donationCenterId = donationCenter.id;

  const { data: donation, error: donationErr } = await supabase.from('donation_requests').insert({
    session_id: `${runId}_session`, name: 'Integration Test', phone: '+15879990001', normalized_phone: '+15879990001',
    address: '456 Test Ave', lat: 51.051, lng: -114.071, status: 'ai_approved', policy_version_id: policy.id,
  }).select().single();
  assert.equal(donationErr, null, donationErr?.message);
  seeded.donationRequestId = donation.id;

  await supabase.from('donation_request_items').insert({
    donation_request_id: donation.id, name: 'Test sofa', category: 'furniture', quantity: 1,
    condition: 'good', volume_cuft: 30, weight_kg_min: 20, weight_kg_max: 40, suitability: 'suitable', confidence: 0.9,
  }).throwOnError();

  const { data: crewAssignment } = await supabase.from('crew_assignments').insert({
    assignment_date: new Date().toISOString().slice(0, 10), status: 'scheduled',
  }).select().single();
  seeded.crewAssignmentId = crewAssignment.id;
  seeded.routePlanIds = [];

  const { data: routePlanV1 } = await supabase.from('route_plans').insert({
    crew_assignment_id: crewAssignment.id, route_version: 1, stops: [],
  }).select().single();
  seeded.routePlanIds.push(routePlanV1.id);

  // ---------- Staff sessions ----------
  const { data: roleRows } = await supabase.from('staff_roles').select('id,name');
  const roleByName = new Map((roleRows || []).map((r) => [r.name, r.id]));
  const makeEmployee = async (role, token) => {
    const { data: employee, error } = await supabase.from('employees').insert({
      email: `${runId}_${role}@example.test`, password_hash: 'integration-test', name: `${role} Integration`, status: 'active', pay_rate: 25,
    }).select().single();
    assert.equal(error, null, `employee seed failed for ${role}: ${error?.message}`);
    await supabase.from('staff_role_assignments').insert({ employee_id: employee.id, role_id: roleByName.get(role) }).throwOnError();
    await supabase.from('employee_sessions').insert({ token, employee_id: employee.id, expires_at: new Date(Date.now() + 3600_000).toISOString() }).throwOnError();
    return employee;
  };
  const owner = await makeEmployee('owner', ownerSession);
  const admin = await makeEmployee('admin', adminSession);
  const manager = await makeEmployee('manager', managerSession);
  const employee = await makeEmployee('employee', employeeSession);

  // ---------- Permissions matrix on the route-fit endpoint ----------
  const routeFitPath = `/api/admin/donations/${donation.id}/route-fit`;
  const evalBody = JSON.stringify({ crew_assignment_ids: [crewAssignment.id] });

  const unauth = await appFetch(routeFitPath, { method: 'POST', headers, body: evalBody });
  assert.equal(unauth.res.status, 401, 'Unauthenticated route-fit evaluation must return 401.');

  const employeeDenied = await appFetch(routeFitPath, { method: 'POST', headers: { ...headers, ...cookieFor(employeeSession) }, body: evalBody });
  assert.equal(employeeDenied.res.status, 403, 'Employee must be denied donations.route_match.');

  const managerOutOfScope = await appFetch(routeFitPath, { method: 'POST', headers: { ...headers, ...cookieFor(managerSession) }, body: evalBody });
  assert.equal(managerOutOfScope.res.status, 403, 'Manager without a matching scope must be denied.');

  await supabase.from('manager_scopes').insert({
    employee_id: manager.id, scope_type: 'crew_assignment', scope_value: crewAssignment.id, effect: 'allow', reason: `${runId} scope grant`,
  }).throwOnError();

  const managerInScope = await appFetch(routeFitPath, { method: 'POST', headers: { ...headers, ...cookieFor(managerSession) }, body: evalBody });
  assert.equal(managerInScope.res.status, 200, `Scoped manager should be allowed: ${managerInScope.text}`);

  const ownerOk = await appFetch(routeFitPath, { method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: evalBody });
  assert.equal(ownerOk.res.status, 200, `Owner should always be allowed: ${ownerOk.text}`);
  assert.equal(ownerOk.json.result.decision, 'fits_current_route', `Expected an empty route to fit cleanly: ${JSON.stringify(ownerOk.json.result)}`);
  const routeMatchId = ownerOk.json.route_match.id;

  // ---------- Route proposal: create, approve, verify new route_plans version + events ----------
  const proposalCreate = await appFetch('/api/admin/donations/route-proposals', {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) },
    body: JSON.stringify({ donation_request_id: donation.id, donation_route_match_id: routeMatchId }),
  });
  assert.equal(proposalCreate.res.status, 200, `Proposal creation failed: ${proposalCreate.text}`);
  const proposalId = proposalCreate.json.proposal.id;
  assert.equal(proposalCreate.json.proposal.source_route_version, 1);

  const approve = await appFetch(`/api/admin/donations/route-proposals/${proposalId}`, {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: JSON.stringify({ action: 'approve', reason: `${runId} approval` }),
  });
  assert.equal(approve.res.status, 200, `Approval failed: ${approve.text}`);
  assert.equal(approve.json.route_plan.route_version, 2, 'Approval must create route_version 2, never mutate v1.');
  seeded.routePlanIds.push(approve.json.route_plan.id);

  const { data: v1Untouched } = await supabase.from('route_plans').select('stops').eq('id', routePlanV1.id).single();
  assert.deepEqual(v1Untouched.stops, [], 'Original route_plans row must never be mutated.');

  const { data: timelineRows } = await supabase.from('timeline_events').select('event_type').eq('entity_type', 'donation_request').eq('entity_id', donation.id).eq('event_type', 'donation_route_proposal_approved');
  assert.ok(timelineRows?.length >= 1, 'Approval must record a timeline event.');
  const { data: auditRows } = await supabase.from('audit_events').select('event_type').eq('entity_type', 'donation_route_proposal').eq('entity_id', proposalId);
  assert.ok(auditRows?.length >= 1, 'Approval must record an audit event.');

  // ---------- Stale proposal rejection ----------
  // Build a second proposal against the now-outdated v1 snapshot and try to approve it.
  const staleProposal = await appFetch('/api/admin/donations/route-proposals', {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) },
    body: JSON.stringify({ donation_request_id: donation.id, donation_route_match_id: routeMatchId }),
  });
  // route-fit already re-evaluated against v2 above via ownerOk's route_match if re-run were needed;
  // here we directly manufacture a stale proposal row pointing at v1 to prove approval rejects it.
  const { data: staleRow } = await supabase.from('donation_route_proposals').insert({
    donation_request_id: donation.id, crew_assignment_id: crewAssignment.id, source_route_plan_id: routePlanV1.id,
    source_route_version: 1, proposed_stop: {}, proposed_insertion_index: 0, before_route: [], proposed_route: [],
    status: 'pending', expires_at: new Date(Date.now() + 3600_000).toISOString(),
  }).select().single();
  const staleApprove = await appFetch(`/api/admin/donations/route-proposals/${staleRow.id}`, {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: JSON.stringify({ action: 'approve' }),
  });
  assert.equal(staleApprove.res.status, 409, `Stale proposal approval must be rejected with 409: ${staleApprove.text}`);
  const { data: staleAfter } = await supabase.from('donation_route_proposals').select('status').eq('id', staleRow.id).single();
  assert.equal(staleAfter.status, 'stale');
  if (staleProposal.json?.proposal?.id) await supabase.from('donation_route_proposals').delete().eq('id', staleProposal.json.proposal.id);

  // ---------- Capacity: manual correction is never silently overwritten by AI ----------
  const capacityPath = `/api/admin/donations/${donation.id}/capacity`;
  const recompute = await appFetch(capacityPath, { method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: JSON.stringify({ action: 'recompute' }) });
  assert.equal(recompute.res.status, 200, recompute.text);
  assert.equal(recompute.json.estimate.source, 'ai');

  const correct = await appFetch(capacityPath, {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) },
    body: JSON.stringify({ action: 'correct', reason: `${runId} manual correction`, correction: { crew_count: 4, weight_kg_max: 999 } }),
  });
  assert.equal(correct.res.status, 200, correct.text);
  assert.equal(correct.json.estimate.source, 'manual');
  assert.equal(correct.json.estimate.is_final, true);

  const rerunAi = await appFetch(capacityPath, { method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: JSON.stringify({ action: 'recompute' }) });
  assert.equal(rerunAi.res.status, 200, rerunAi.text);
  assert.equal(rerunAi.json.estimate.source, 'ai'); // new AI row created...

  const effective = await appFetch(capacityPath, { headers: cookieFor(ownerSession) });
  assert.equal(effective.res.status, 200);
  assert.equal(effective.json.effective.crew_count, 4, 'Effective estimate must still be the manual correction, not the newer AI row.');

  // ---------- Destination: manager override is audited ----------
  const destinationsPath = `/api/admin/donations/${donation.id}/destinations`;
  const score = await appFetch(destinationsPath, { method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) }, body: JSON.stringify({ action: 'score' }) });
  assert.equal(score.res.status, 200, score.text);
  assert.ok(score.json.scores.some((s) => s.destination_id === donationCenter.id && s.considered));

  const badOverride = await appFetch(destinationsPath, {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) },
    body: JSON.stringify({ action: 'override', destination_score_id: score.json.selected.id }),
  });
  assert.equal(badOverride.res.status, 422, 'Override without a reason must be rejected.');

  const goodOverride = await appFetch(destinationsPath, {
    method: 'POST', headers: { ...headers, ...cookieFor(ownerSession) },
    body: JSON.stringify({ action: 'override', destination_score_id: score.json.selected.id, reason: `${runId} override reason` }),
  });
  assert.equal(goodOverride.res.status, 200, goodOverride.text);
  const { data: overrideAudit } = await supabase.from('audit_events').select('reason').eq('entity_type', 'donation_request').eq('entity_id', donation.id).eq('event_type', 'donation_destination_overridden');
  assert.ok(overrideAudit?.some((a) => a.reason === `${runId} override reason`), 'Destination override must be audited with its reason.');

  console.log(JSON.stringify({
    ok: true,
    status: 'PASSED',
    test_environment: testEnvironment,
    test_project_ref: testProjectRef,
    workflows: {
      schema: 'PASSED',
      route_fit_permissions_matrix: 'PASSED',
      route_proposal_approval_versioning: 'PASSED',
      stale_proposal_rejection: 'PASSED',
      capacity_manual_override_precedence: 'PASSED',
      destination_override_audit: 'PASSED',
    },
  }, null, 2));
} finally {
  await cleanup();
}
