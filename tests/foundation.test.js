import assert from 'node:assert/strict';
import { normalizePhone } from '../lib/phone.js';
import { validateDonationPhotos, assertDonationTransition, analyzeDonationSubmission } from '../lib/donation.js';
import { roleAllows } from '../lib/permissionRules.js';
import { classifyInboundText, responseMatchesExpected } from '../lib/quoRules.js';

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
assert.equal(roleAllows('owner', 'refunds.issue'), true);

assert.equal(classifyInboundText('STOP'), 'STOP');
assert.equal(classifyInboundText('start'), 'START');
assert.equal(classifyInboundText('yes'), 'AFFIRMATIVE');
assert.equal(responseMatchesExpected('YES', { status: 'active', valid_responses: ['YES'] }), true);
assert.equal(responseMatchesExpected('YES', { status: 'expired', valid_responses: ['YES'] }), false);

console.log('foundation tests passed');
