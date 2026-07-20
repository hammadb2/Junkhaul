import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { normalizePhone } from '../lib/phone.js';
import { validateDonationPhotos, assertDonationTransition, analyzeDonationSubmission } from '../lib/donation.js';
import { classifyInboundText, responseMatchesExpected } from '../lib/quoRules.js';
import { inspectDonationImage, MAX_DONATION_PHOTO_BYTES } from '../lib/donationPhotos.js';
import { isQuoDeliveryEvent, parseQuoPayload } from '../lib/quoPayload.js';

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

console.log('foundation tests passed');
