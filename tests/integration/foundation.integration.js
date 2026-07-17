import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { signQuoWebhookBody } from '../../lib/quoWebhookAuth.js';

const dbUrl = process.env.TEST_SUPABASE_DB_URL || process.env.TEST_DATABASE_URL;
const supabaseUrl = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const appBaseUrl = process.env.TEST_APP_BASE_URL;
const testEnvironment = process.env.TEST_ENVIRONMENT;
const testProjectRef = process.env.TEST_PROJECT_REF;
const approvedProjectRef = process.env.APPROVED_TEST_PROJECT_REF;
const allowReset = process.env.ALLOW_TEST_DATABASE_RESET === 'true';
const allowRemote = process.env.ALLOW_REMOTE_TEST_DATABASE === 'true';
const applyMigrations = process.env.INTEGRATION_APPLY_MIGRATIONS === 'true';
const bucketName = process.env.TEST_STORAGE_BUCKET || 'donation-photos';
const quoSigningSecret = process.env.TEST_QUO_WEBHOOK_SIGNING_SECRET;

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
      'TEST_DATABASE_URL or TEST_SUPABASE_DB_URL',
      'TEST_APP_BASE_URL',
      'ALLOW_TEST_DATABASE_RESET=true',
      'ALLOW_REMOTE_TEST_DATABASE=true for remote disposable Supabase only',
      'QUO_TEST_MODE=true on the tested app environment',
      'TEST_QUO_WEBHOOK_SIGNING_SECRET matching app QUO_WEBHOOK_SIGNING_SECRET',
    ],
  }, null, 2));
  process.exit(2);
}

if (!dbUrl && !supabaseUrl && !serviceKey && !appBaseUrl) {
  notRun('No staging/local Supabase integration environment was provided.');
}

const denyFragments = [
  'mvsopvphpuucrbuqsfky',
  'aws-0-us-east-1.pooler.supabase.com',
  'supabase.com/dashboard/project/mvsopvphpuucrbuqsfky',
  'gpyooSTnLW56DGmn',
];

for (const value of [dbUrl, supabaseUrl, testProjectRef, approvedProjectRef].filter(Boolean)) {
  if (denyFragments.some((fragment) => String(value).includes(fragment))) {
    throw new Error('Refusing to run integration tests against known production Supabase identifiers.');
  }
}

assert.ok(['staging', 'local'].includes(testEnvironment), 'TEST_ENVIRONMENT must be staging or local.');
assert.ok(testProjectRef && approvedProjectRef && testProjectRef === approvedProjectRef, 'TEST_PROJECT_REF must match APPROVED_TEST_PROJECT_REF.');
assert.equal(allowReset, true, 'ALLOW_TEST_DATABASE_RESET=true is required for integration tests.');
assert.ok(dbUrl, 'TEST_DATABASE_URL or TEST_SUPABASE_DB_URL is required.');
assert.ok(supabaseUrl, 'TEST_SUPABASE_URL is required.');
assert.ok(serviceKey, 'TEST_SUPABASE_SERVICE_ROLE_KEY is required.');
assert.ok(appBaseUrl, 'TEST_APP_BASE_URL is required for route-level integration tests.');
assert.ok(quoSigningSecret, 'TEST_QUO_WEBHOOK_SIGNING_SECRET is required for signed Quo route tests.');
if (/supabase\.(co|com)/i.test(dbUrl + supabaseUrl) && !allowRemote) {
  throw new Error('Remote Supabase integration tests require ALLOW_REMOTE_TEST_DATABASE=true and a disposable/staging project.');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function psql(args, input = null) {
  const result = spawnSync('psql', [dbUrl, ...args], {
    input,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`psql failed (${args.join(' ')}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

const psqlVersion = spawnSync('psql', ['--version'], { encoding: 'utf8' });
assert.equal(psqlVersion.status, 0, 'psql CLI is required.');

const currentDatabase = psql(['-Atc', 'select current_database()']).trim();
const currentUser = psql(['-Atc', 'select current_user']).trim();
const postgresVersion = psql(['-Atc', 'show server_version']).trim();

if (applyMigrations) {
  const tracked = spawnSync('git', ['ls-files', 'supabase/migrations/*.sql'], { encoding: 'utf8' });
  assert.equal(tracked.status, 0, 'git ls-files is required to resolve tracked migrations.');
  const files = tracked.stdout.trim().split('\n').filter(Boolean).sort();
  for (const file of files) {
    psql(['-v', 'ON_ERROR_STOP=1'], readFileSync(join(process.cwd(), file), 'utf8'));
  }
}

const runId = `it_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
const sessionId = `${runId}_session`;
const phone = `+1587${String(Date.now()).slice(-7)}`;
const headers = { 'content-type': 'application/json' };

async function appFetch(path, options = {}) {
  const res = await fetch(`${appBaseUrl.replace(/\/$/, '')}${path}`, {
    redirect: 'manual',
    ...options,
    headers: { ...(options.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { res, text, json, cookie: res.headers.get('set-cookie') };
}

async function signedQuoWebhook(payload) {
  const raw = JSON.stringify(payload);
  return appFetch('/api/quo/inbound', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'openphone-signature': signQuoWebhookBody({ rawBody: raw, signingSecret: quoSigningSecret }),
    },
    body: raw,
  });
}

async function uploadDonationPhoto({ donationRequestId, token, photoType, fileName = `${photoType}.jpg`, replacePhotoId = null }) {
  const image = await sharp({
    create: { width: 420, height: 420, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer();
  const form = new FormData();
  form.append('donation_request_id', donationRequestId);
  form.append('token', token);
  form.append('photo_type', photoType);
  if (replacePhotoId) form.append('replace_photo_id', replacePhotoId);
  form.append('file', new Blob([image], { type: 'image/jpeg' }), fileName);
  return appFetch('/api/donation-request/photos', { method: 'POST', body: form });
}

async function cleanup() {
  if (serviceKey && supabaseUrl) {
    const { data: donationRows } = await supabase.from('donation_requests').select('id').eq('session_id', sessionId).catch(() => ({ data: [] }));
    for (const request of donationRows || []) {
      const { data: files } = await supabase.storage.from(bucketName).list(request.id, { limit: 100 }).catch(() => ({ data: [] }));
      const paths = [];
      for (const entry of files || []) {
        const { data: nested } = await supabase.storage.from(bucketName).list(`${request.id}/${entry.name}`, { limit: 100 }).catch(() => ({ data: [] }));
        for (const file of nested || []) paths.push(`${request.id}/${entry.name}/${file.name}`);
      }
      if (paths.length) await supabase.storage.from(bucketName).remove(paths).catch(() => {});
    }
  }
  await supabase.from('messages').delete().like('body', `%${runId}%`).catch(() => {});
  await supabase.from('messages').delete().in('provider_sid', [`${runId}_stop_msg`, `${runId}_start_msg`, `${runId}_yes_msg`, `${runId}_delivery_msg`]).catch(() => {});
  await supabase.from('quo_webhook_events').delete().like('provider_event_id', `${runId}%`).catch(() => {});
  await supabase.from('expected_replies').delete().eq('normalized_phone', phone).catch(() => {});
  await supabase.from('sms_suppression').delete().eq('normalized_phone', phone).catch(() => {});
  await supabase.from('sms_consent').delete().eq('normalized_phone', phone).catch(() => {});
  await supabase.from('donation_requests').delete().eq('session_id', sessionId).catch(() => {});
  await supabase.from('leads').delete().eq('session_id', sessionId).catch(() => {});
  await supabase.from('bookings').delete().like('booking_ref', `${runId}%`).catch(() => {});
  await supabase.from('campaign_tracking_codes').delete().eq('code', 'DH-COV-001').catch(() => {});
  await supabase.from('campaign_batches').delete().like('name', `${runId}%`).catch(() => {});
  await supabase.from('marketing_campaigns').delete().like('name', `${runId}%`).catch(() => {});
}

await cleanup();

try {
  const requiredTables = [
    'marketing_campaigns', 'campaign_batches', 'campaign_tracking_codes', 'attribution_records',
    'funnel_events', 'message_entity_links', 'quo_webhook_events', 'sms_consent', 'sms_suppression',
    'expected_replies', 'donation_requests', 'donation_request_photos', 'donation_policy_versions',
    'quote_price_ledger', 'timeline_events', 'audit_events', 'staff_roles', 'permissions',
    'manager_scopes',
  ];
  for (const table of requiredTables) {
    const exists = psql(['-Atc', `select exists (select 1 from information_schema.tables where table_schema='public' and table_name='${table}')`]).trim();
    assert.equal(exists, 't', `Missing table ${table}`);
  }

  const requiredColumns = [
    ['messages', 'provider_event_id'],
    ['messages', 'failure_code'],
    ['donation_requests', 'resume_token_hash'],
    ['donation_request_photos', 'storage_path'],
    ['donation_request_photos', 'mime_type'],
  ];
  for (const [table, column] of requiredColumns) {
    const exists = psql(['-Atc', `select exists (select 1 from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}')`]).trim();
    assert.equal(exists, 't', `Missing column ${table}.${column}`);
  }

  const bucket = await supabase.storage.getBucket(bucketName);
  assert.equal(bucket.error, null, `Storage bucket ${bucketName} missing: ${bucket.error?.message}`);
  assert.equal(bucket.data.public, false, 'Donation photo bucket must be private.');

  const { data: campaign, error: campaignError } = await supabase.from('marketing_campaigns').insert({
    name: `${runId} door hanger`,
    channel: 'offline',
    source: 'door_hanger',
    active: true,
  }).select().single();
  assert.equal(campaignError, null);
  const { data: batch } = await supabase.from('campaign_batches').insert({
    campaign_id: campaign.id,
    name: `${runId} batch`,
    neighbourhood: 'Coventry Hills',
    planned_quantity: 10,
    actual_quantity: 10,
    destination_page: '/book/hanger',
    active: true,
  }).select().single();
  await supabase.from('campaign_tracking_codes').insert({
    campaign_id: campaign.id,
    batch_id: batch.id,
    code: 'DH-COV-001',
    code_type: 'qr',
    destination_page: '/book/hanger',
    active: true,
  }).throwOnError();

  const hanger = await appFetch('/book/hanger?code=DH-COV-001');
  assert.equal(hanger.res.status, 307, 'Hanger route should redirect after server-side attribution capture.');
  assert.ok(hanger.cookie, 'Hanger route should set an attribution/session cookie.');

  const leadInit = await appFetch('/api/capture-lead', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'init',
      session_id: sessionId,
      phone,
      source: 'door_hanger',
      channel: 'offline',
      code: 'DH-COV-001',
      tracking_code: 'DH-COV-001',
      landing_path: '/book/hanger',
      sms_consent_source: 'integration_test',
    }),
  });
  assert.equal(leadInit.res.status, 200, leadInit.text);
  const leadId = leadInit.json.lead_id;
  assert.ok(leadId);
  const { data: firstTouch } = await supabase.from('attribution_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('touch_type', 'first')
    .single();
  assert.equal(firstTouch.campaign_id, campaign.id);
  assert.equal(firstTouch.lead_id, leadId);

  const secondLead = await appFetch('/api/capture-lead', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'update', session_id: sessionId, current_step: 'returned_to_book' }),
  });
  assert.equal(secondLead.res.status, 200, secondLead.text);
  const { count: firstTouchCount } = await supabase.from('attribution_records')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('touch_type', 'first');
  assert.equal(firstTouchCount, 1, 'First touch should remain immutable on return.');

  const draft = await appFetch('/api/donation-request/draft', {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, phone, name: 'Integration Test', address: '123 Test Ave Calgary AB' }),
  });
  assert.equal(draft.res.status, 200, draft.text);
  const donationRequestId = draft.json.donation_request_id;
  const token = draft.json.token;
  assert.ok(donationRequestId && token);
  const { data: storedDraft } = await supabase.from('donation_requests').select('resume_token_hash').eq('id', donationRequestId).single();
  assert.notEqual(storedDraft.resume_token_hash, token, 'Resume token must not be stored in plaintext.');

  const missingSubmit = await appFetch('/api/donation-request', {
    method: 'POST',
    headers,
    body: JSON.stringify({ donation_request_id: donationRequestId, token, session_id: sessionId, phone, address: '123 Test Ave Calgary AB' }),
  });
  assert.equal(missingSubmit.res.status, 400, 'Submission without required stored photos must fail.');

  const badUpload = await uploadDonationPhoto({
    donationRequestId,
    token: `${token}_wrong`,
    photoType: 'full_item_view',
  });
  assert.equal(badUpload.res.status, 400, 'Wrong ownership token must fail upload.');

  const firstUpload = await uploadDonationPhoto({ donationRequestId, token, photoType: 'full_item_view', fileName: '../escape.jpg' });
  assert.equal(firstUpload.res.status, 200, firstUpload.text);
  assert.ok(firstUpload.json.photo.storage_path.startsWith(`${donationRequestId}/full_item_view/`), 'Storage path must be server-generated.');
  assert.equal(firstUpload.json.photo.original_filename, '../escape.jpg', 'Original filename is metadata only.');
  const storageCheck = await supabase.storage.from(bucketName).download(firstUpload.json.photo.storage_path);
  assert.equal(storageCheck.error, null, `Uploaded object must exist in private storage: ${storageCheck.error?.message}`);

  const replaceUpload = await uploadDonationPhoto({
    donationRequestId,
    token,
    photoType: 'full_item_view',
    replacePhotoId: firstUpload.json.photo.id,
  });
  assert.equal(replaceUpload.res.status, 200, replaceUpload.text);
  const { data: replacedPhoto } = await supabase.from('donation_request_photos').select('removed_at, retention_state').eq('id', firstUpload.json.photo.id).single();
  assert.equal(replacedPhoto.retention_state, 'replaced');
  assert.ok(replacedPhoto.removed_at);

  const removeUpload = await appFetch('/api/donation-request/photos', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ donation_request_id: donationRequestId, token, photo_id: replaceUpload.json.photo.id }),
  });
  assert.equal(removeUpload.res.status, 200, removeUpload.text);
  const { data: removedPhoto } = await supabase.from('donation_request_photos').select('removed_at, retention_state').eq('id', replaceUpload.json.photo.id).single();
  assert.equal(removedPhoto.retention_state, 'removed');
  assert.ok(removedPhoto.removed_at);

  for (const type of ['full_item_view', 'condition_close_up', 'damage_photo', 'total_quantity_context']) {
    const uploaded = await uploadDonationPhoto({ donationRequestId, token, photoType: type });
    assert.equal(uploaded.res.status, 200, `${type} upload failed: ${uploaded.text}`);
  }

  const validSubmit = await appFetch('/api/donation-request', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      donation_request_id: donationRequestId,
      token,
      session_id: sessionId,
      name: 'Integration Test',
      phone,
      address: '123 Test Ave Calgary AB',
      description: 'Clean usable table and chairs',
      confirmations: {
        confirmation_photos_accurate: true,
        confirmation_items_clean: true,
        confirmation_items_usable: true,
        confirmation_no_garbage: true,
        confirmation_no_hazmat: true,
      },
    }),
  });
  assert.equal(validSubmit.res.status, 200, validSubmit.text);
  const { data: submittedDonation } = await supabase.from('donation_requests').select('status, submitted_at').eq('id', donationRequestId).single();
  assert.ok(['manual_review', 'route_waiting', 'needs_more_photos', 'paid_quote_offered'].includes(submittedDonation.status));
  assert.ok(submittedDonation.submitted_at);

  const activeRls = psql(['-Atc', "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('donation_requests','messages','audit_events','staff_roles','quo_webhook_events') and c.relrowsecurity"]).trim();
  assert.equal(activeRls, '5', 'RLS must be enabled on sensitive foundation tables.');

  const anonClient = createClient(supabaseUrl, process.env.TEST_SUPABASE_ANON_KEY || 'anon-key-not-configured');
  const anonRead = await anonClient.from('donation_requests').select('id').limit(1);
  assert.notEqual(anonRead.error, null, 'Anonymous browser client must not read donation requests directly.');

  await supabase.from('sms_consent').upsert({
    phone,
    normalized_phone: phone,
    consent_source: 'integration_test',
    current_eligibility: true,
  }, { onConflict: 'normalized_phone' }).throwOnError();

  const stopPayload = {
    id: `${runId}_stop_event`,
    type: 'message.received',
    createdAt: new Date().toISOString(),
    data: { object: { id: `${runId}_stop_msg`, object: 'message', from: phone, to: '+15870000000', direction: 'incoming', body: 'STOP', status: 'received' } },
  };
  const stopResult = await signedQuoWebhook(stopPayload);
  assert.equal(stopResult.res.status, 200, stopResult.text);
  const { data: suppression } = await supabase.from('sms_suppression').select('*').eq('normalized_phone', phone).single();
  assert.equal(suppression.reason, 'customer_stop');

  const startPayload = {
    id: `${runId}_start_event`,
    type: 'message.received',
    createdAt: new Date().toISOString(),
    data: { object: { id: `${runId}_start_msg`, object: 'message', from: phone, to: '+15870000000', direction: 'incoming', body: 'START', status: 'received' } },
  };
  const startResult = await signedQuoWebhook(startPayload);
  assert.equal(startResult.res.status, 200, startResult.text);
  const { data: lifted } = await supabase.from('sms_suppression').select('*').eq('normalized_phone', phone).single();
  assert.ok(lifted.lifted_at);

  const { data: expected } = await supabase.from('expected_replies').insert({
    phone,
    normalized_phone: phone,
    entity_type: 'donation_request',
    entity_id: donationRequestId,
    expected_intent: 'donation_pickup_offer',
    valid_responses: ['YES'],
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }).select().single();
  const yesPayload = {
    id: `${runId}_yes_event`,
    type: 'message.received',
    createdAt: new Date().toISOString(),
    data: { object: { id: `${runId}_yes_msg`, object: 'message', from: phone, to: '+15870000000', direction: 'incoming', body: 'YES', status: 'received' } },
  };
  const yesResult = await signedQuoWebhook(yesPayload);
  assert.equal(yesResult.res.status, 200, yesResult.text);
  const { data: consumed } = await supabase.from('expected_replies').select('status, consumed_at').eq('id', expected.id).single();
  assert.equal(consumed.status, 'consumed');
  assert.ok(consumed.consumed_at);
  const replay = await signedQuoWebhook(yesPayload);
  assert.equal(replay.res.status, 200, replay.text);
  assert.equal(replay.json.duplicate, true);

  await supabase.from('messages').insert({
    direction: 'outbound',
    to_number: phone,
    from_number: '+15870000000',
    body: `${runId} delivery test`,
    provider_sid: `${runId}_delivery_msg`,
    provider_status: 'queued',
  }).throwOnError();
  const deliveryPayload = {
    id: `${runId}_delivery_event`,
    type: 'message.delivered',
    createdAt: new Date().toISOString(),
    data: { object: { id: `${runId}_delivery_msg`, object: 'message', from: '+15870000000', to: phone, direction: 'outgoing', body: `${runId} delivery test`, status: 'delivered' } },
  };
  const deliveryResult = await signedQuoWebhook(deliveryPayload);
  assert.equal(deliveryResult.res.status, 200, deliveryResult.text);
  const { data: delivered } = await supabase.from('messages').select('provider_status, delivered_at, provider_event_id').eq('provider_sid', `${runId}_delivery_msg`).single();
  assert.equal(delivered.provider_status, 'delivered');
  assert.ok(delivered.delivered_at);
  assert.equal(delivered.provider_event_id, `${runId}_delivery_event`);

  console.log(JSON.stringify({
    ok: true,
    status: 'PASSED',
    database: currentDatabase,
    user: currentUser,
    postgres_version: postgresVersion,
    test_environment: testEnvironment,
    test_project_ref: testProjectRef,
    migrations_applied: applyMigrations,
    storage_bucket: bucketName,
    workflows: {
      schema: 'PASSED',
      storage_bucket_private: 'PASSED',
      hanger_attribution: 'PASSED',
      donation_upload_replace_remove_submit: 'PASSED',
      quo_signed_stop_start_expected_reply_delivery: 'PASSED',
      rls: 'PASSED',
    },
  }, null, 2));
} finally {
  await cleanup();
}
