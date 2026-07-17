import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { normalizePhone } from '../lib/phone.js';
import { validateDonationPhotos, assertDonationTransition, analyzeDonationSubmission } from '../lib/donation.js';
import { roleAllows } from '../lib/permissionRules.js';
import { canAdminManageManagerAction, MANAGER_MANAGEMENT_ACTIONS } from '../lib/staffAccessRules.js';
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

const adminManagerContext = {
  employee: { id: 'admin-1' },
  roles: ['admin'],
  permissions: ['staff_access.manage_managers'],
};
for (const action of MANAGER_MANAGEMENT_ACTIONS) {
  assert.equal(
    canAdminManageManagerAction({ context: adminManagerContext, action, targetEmployeeId: 'manager-1', targetRoles: ['manager'], role: action.includes('role') ? 'manager' : null }).ok,
    true,
    `admin should be allowed to perform ${action} on a manager`
  );
}
assert.equal(canAdminManageManagerAction({ context: adminManagerContext, action: 'assign_role', targetEmployeeId: 'manager-1', targetRoles: ['manager'], role: 'owner' }).ok, false);
assert.equal(canAdminManageManagerAction({ context: adminManagerContext, action: 'assign_role', targetEmployeeId: 'manager-1', targetRoles: ['manager'], role: 'admin' }).ok, false);
assert.equal(canAdminManageManagerAction({ context: adminManagerContext, action: 'assign_role', targetEmployeeId: 'admin-1', targetRoles: ['admin'], role: 'manager' }).ok, false);
assert.equal(canAdminManageManagerAction({ context: adminManagerContext, action: 'remove_role', targetEmployeeId: 'owner-1', targetRoles: ['owner'], role: 'owner', isFinalOwner: true }).ok, false);
assert.equal(canAdminManageManagerAction({ context: adminManagerContext, action: 'assign_permission', targetEmployeeId: 'manager-1', targetRoles: ['manager'], permission: { key: 'payroll.approve' } }).ok, false);
assert.equal(canAdminManageManagerAction({ context: { employee: { id: 'manager-1' }, roles: ['manager'], permissions: [] }, action: 'assign_role', targetEmployeeId: 'employee-1', targetRoles: [], role: 'manager' }).ok, false);
assert.equal(canAdminManageManagerAction({ context: { employee: { id: 'employee-1' }, roles: ['employee'], permissions: [] }, action: 'assign_role', targetEmployeeId: 'manager-1', targetRoles: ['manager'], role: 'manager' }).ok, false);

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

const staffAccessRouteSource = readFileSync(new URL('../app/api/admin/staff-access/route.js', import.meta.url), 'utf8');
assert.match(staffAccessRouteSource, /jsonUnauthorized/);
for (const action of ['create_manager', 'assign_role', 'assign_scope', 'change_scope', 'remove_scope', 'disable_access', 'reactivate_access', 'remove_role']) {
  assert.match(staffAccessRouteSource, new RegExp(action));
}
assert.match(staffAccessRouteSource, /await auditAccess/);

// Session security: blocked statuses must be rejected by getSessionEmployee.
// We verify by reading the source (the module imports supabase which is
// lazily proxied for Next.js but not importable in raw Node test context).
const employeeAuthSource = readFileSync(new URL('../lib/employeeAuth.js', import.meta.url), 'utf8');
assert.match(employeeAuthSource, /BLOCKED_STATUSES.*terminated.*rejected.*deletion_requested/, 'must define all three blocked statuses');
assert.match(employeeAuthSource, /BLOCKED_STATUSES\.has\(emp\.status\)/, 'getSessionEmployee must check blocked statuses');
assert.match(employeeAuthSource, /BLOCKED_STATUSES.*has.*emp\.status.*\n.*delete\(\)\.eq\('token', token\)/, 'getSessionEmployee must destroy session for blocked employees');
// Ensure active/onboarded/pending_verification are NOT in the blocked set.
assert.doesNotMatch(employeeAuthSource, /BLOCKED_STATUSES.*active/, 'active must not be blocked');
assert.doesNotMatch(employeeAuthSource, /BLOCKED_STATUSES.*onboarded/, 'onboarded must not be blocked');
assert.doesNotMatch(employeeAuthSource, /BLOCKED_STATUSES.*pending_verification/, 'pending_verification must not be blocked');

// Booking assignment check: crew endpoints must verify the employee is
// assigned to the booking before allowing photo upload, payment collection,
// or payment link resend.
assert.match(employeeAuthSource, /isEmployeeAssignedToBooking/, 'must export isEmployeeAssignedToBooking');
assert.match(employeeAuthSource, /driver_employee_id\.eq.*secondary_employee_id\.eq/, 'must check driver or secondary assignment');

// Verify all three crew endpoints import and use the assignment check.
const uploadPhotoSource = readFileSync(new URL('../app/api/crew/upload-photo/route.js', import.meta.url), 'utf8');
assert.match(uploadPhotoSource, /isEmployeeAssignedToBooking/, 'upload-photo must check booking assignment');
assert.match(uploadPhotoSource, /Not assigned to this booking/, 'upload-photo must reject unassigned employees');

const collectPaymentSource = readFileSync(new URL('../app/api/crew/collect-payment/route.js', import.meta.url), 'utf8');
assert.match(collectPaymentSource, /isEmployeeAssignedToBooking/, 'collect-payment must check booking assignment');
assert.match(collectPaymentSource, /Not assigned to this booking/, 'collect-payment must reject unassigned employees');
assert.match(collectPaymentSource, /already paid/, 'collect-payment must reject duplicate payments');
assert.match(collectPaymentSource, /payment_status.*pending.*unpaid/, 'collect-payment must only allow pending/unpaid');

const resendLinkSource = readFileSync(new URL('../app/api/crew/resend-payment-link/route.js', import.meta.url), 'utf8');
assert.match(resendLinkSource, /isEmployeeAssignedToBooking/, 'resend-payment-link must check booking assignment');
assert.match(resendLinkSource, /Not assigned to this booking/, 'resend-payment-link must reject unassigned employees');

console.log('foundation tests passed');
