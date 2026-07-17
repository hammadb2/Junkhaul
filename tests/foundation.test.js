import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { normalizePhone } from '../lib/phone.js';
import { validateDonationPhotos, assertDonationTransition, analyzeDonationSubmission } from '../lib/donation.js';
import { roleAllows } from '../lib/permissionRules.js';
import { classifyInboundText, responseMatchesExpected } from '../lib/quoRules.js';
import { inspectDonationImage, MAX_DONATION_PHOTO_BYTES } from '../lib/donationPhotos.js';
import { isQuoDeliveryEvent, parseQuoPayload } from '../lib/quoPayload.js';
import { signQuoWebhookBody, verifyQuoWebhookSignature } from '../lib/quoWebhookAuth.js';

assert.equal(normalizePhone('(587) 325-0751'), '+15873250751');

assert.deepEqual(
  validateDonationPhotos([{ photo_type: 'full_item_view' }]).missing,
  ['condition_close_up', 'damage_photo', 'total_quantity_context']
);

assert.throws(() => assertDonationTransition('draft', 'picked_up'), /Invalid donation transition/);
assert.equal(assertDonationTransition('draft', 'submitted'), true);

const unclear = analyzeDonationSubmission({
  description: 'clean table',
  photos: [
    { photo_type: 'full_item_view' },
    { photo_type: 'condition_close_up' },
    { photo_type: 'damage_photo' },
    { photo_type: 'total_quantity_context' },
  ],
  confirmations: {
    confirmation_items_clean: false,
    confirmation_items_usable: true,
    confirmation_no_garbage: true,
    confirmation_no_hazmat: true,
  },
});
assert.equal(unclear.outcome, 'ADMIN_REVIEW');

const rejected = analyzeDonationSubmission({
  description: 'mixed garbage and broken glass',
  photos: [
    { photo_type: 'full_item_view' },
    { photo_type: 'condition_close_up' },
    { photo_type: 'damage_photo' },
    { photo_type: 'total_quantity_context' },
  ],
  confirmations: {
    confirmation_items_clean: true,
    confirmation_items_usable: true,
    confirmation_no_garbage: true,
    confirmation_no_hazmat: true,
  },
});
assert.equal(rejected.outcome, 'OFFER_PAID_JUNK_REMOVAL');

assert.equal(roleAllows('manager', 'bookings.assign_crew'), true);
assert.equal(roleAllows('manager', 'payroll.approve'), false);
assert.equal(roleAllows('manager', 'refunds.issue'), false);
assert.equal(roleAllows('manager', 'employees.change_pay_rate'), false);
assert.equal(roleAllows('manager', 'employees.read_sin'), false);
assert.equal(roleAllows('admin', 'billing.manage'), false);
assert.equal(roleAllows('owner', 'refunds.issue'), true);

assert.equal(classifyInboundText('STOP'), 'STOP');
assert.equal(classifyInboundText('start'), 'START');
assert.equal(classifyInboundText('yes'), 'AFFIRMATIVE');
assert.equal(responseMatchesExpected('YES', { status: 'active', valid_responses: ['YES'] }), true);
assert.equal(responseMatchesExpected('YES', { status: 'expired', valid_responses: ['YES'] }), false);

const sampleImage = await sharp({
  create: {
    width: 400,
    height: 400,
    channels: 3,
    background: '#ffffff',
  },
}).jpeg().toBuffer();
const inspected = await inspectDonationImage(sampleImage, 'image/jpeg');
assert.equal(inspected.mimeType, 'image/jpeg');
assert.equal(inspected.width, 400);
assert.equal(inspected.height, 400);
assert.match(inspected.sha256, /^[a-f0-9]{64}$/);

await assert.rejects(
  () => inspectDonationImage(Buffer.alloc(MAX_DONATION_PHOTO_BYTES + 1), 'image/jpeg'),
  /8MB/
);

const quoPayload = {
  id: 'EV_stop_123',
  type: 'message.received',
  data: {
    object: {
      id: 'quo_msg_123',
      from: '+15873250751',
      to: '+15870000000',
      body: 'STOP',
      status: 'received',
    },
  },
};
assert.deepEqual(parseQuoPayload(quoPayload), {
  provider_event_id: 'EV_stop_123',
  provider_event_type: 'message.received',
  provider_event_at: null,
  provider_id: 'quo_msg_123',
  direction: 'inbound',
  from: '+15873250751',
  to: '+15870000000',
  body: 'STOP',
  provider_status: 'received',
  failure_code: null,
  failure_reason: null,
  raw: quoPayload,
});

for (const [fixture, expectedBody, expectedStatus] of [
  ['inbound-sms.json', 'YES', 'received'],
  ['stop.json', 'STOP', 'received'],
  ['start.json', 'START', 'received'],
  ['delivery-failed.json', 'Your pickup request needs more photos.', 'failed'],
]) {
  const payload = JSON.parse(readFileSync(new URL(`./fixtures/quo/${fixture}`, import.meta.url), 'utf8'));
  const parsed = parseQuoPayload(payload);
  assert.equal(parsed.body, expectedBody);
  assert.equal(parsed.provider_status, expectedStatus);
  assert.ok(parsed.provider_id);
}

const deliveryPayload = JSON.parse(readFileSync(new URL('./fixtures/quo/delivery-failed.json', import.meta.url), 'utf8'));
assert.equal(isQuoDeliveryEvent(parseQuoPayload(deliveryPayload)), true);

const rawBody = JSON.stringify(quoPayload);
const signingSecret = Buffer.from('test-signing-secret').toString('base64');
const timestamp = Date.now();
const validSignature = signQuoWebhookBody({ rawBody, signingSecret, timestamp });
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature, now: timestamp }).ok, true);
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature.replace(/.$/, 'A'), now: timestamp }).ok, false);
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature, now: timestamp + 10 * 60 * 1000 }).reason, 'expired_signature');
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: null, now: timestamp }).reason, 'missing_signature');

const migrationRouteSource = readFileSync(new URL('../app/api/admin/run-migration/route.js', import.meta.url), 'utf8');
assert.match(migrationRouteSource, /Runtime migrations are permanently disabled/);
assert.match(migrationRouteSource, /status:\s*410/);
assert.doesNotMatch(migrationRouteSource, /exec_sql/);

const adminLoginSource = readFileSync(new URL('../app/api/admin/login/route.js', import.meta.url), 'utf8');
assert.match(adminLoginSource, /if \(email\) \{/);
assert.match(adminLoginSource, /createSession\(employee\.id\)/);
assert.match(adminLoginSource, /sessionCookieHeader\(session\.token, session\.expiresAt\)/);
assert.doesNotMatch(adminLoginSource, /if \(!password \|\| password !== process\.env\.ADMIN_PASSWORD\) \{\s+if \(!email/);

const commandCenterSource = readFileSync(new URL('../app/api/admin/command-center/route.js', import.meta.url), 'utf8');
assert.match(commandCenterSource, /\.from\('nearby_offers'\)[\s\S]*\.order\('offered_at'/);
assert.doesNotMatch(commandCenterSource, /\.from\('nearby_offers'\)[\s\S]*\.order\('created_at'/);

console.log('foundation tests passed');
