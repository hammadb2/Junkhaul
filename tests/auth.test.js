import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { roleAllows } from '../lib/permissionRules.js';
import { canAdminManageManagerAction, MANAGER_MANAGEMENT_ACTIONS } from '../lib/staffAccessRules.js';
import { signQuoWebhookBody, verifyQuoWebhookSignature } from '../lib/quoWebhookAuth.js';

// Role-based permission boundary tests.
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

// Quo webhook signature verification.
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
const rawBody = JSON.stringify(quoPayload);
const signingSecret = Buffer.from('test-signing-secret').toString('base64');
const timestamp = Date.now();
const validSignature = signQuoWebhookBody({ rawBody, signingSecret, timestamp });
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature, now: timestamp }).ok, true);
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature.replace(/.$/, 'A'), now: timestamp }).ok, false);
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: validSignature, now: timestamp + 10 * 60 * 1000 }).reason, 'expired_signature');
assert.equal(verifyQuoWebhookSignature({ rawBody, signingSecret, signatureHeader: null, now: timestamp }).reason, 'missing_signature');

// Runtime migration route must no longer exist.
const migrationRoutePath = fileURLToPath(new URL('../app/api/admin/run-migration/route.js', import.meta.url));
assert.equal(existsSync(migrationRoutePath), false, 'Runtime migration route must be removed');

// Staff-access route enforces auth and audit.
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

// Fail-closed: null employeeId or bookingId must return false.
assert.match(employeeAuthSource, /if\s*\(!employeeId\s*\|\|\s*!bookingId\)\s*return false/, 'must fail closed on null inputs');
// Fail-closed: missing booking or job_date must return false.
assert.match(employeeAuthSource, /if\s*\(!booking\s*\|\|\s*!booking\.job_date\)\s*return false/, 'must fail closed on missing booking/job_date');

// Must query crew_assignments by assignment_date matching booking.job_date.
assert.match(employeeAuthSource, /assignment_date.*booking\.job_date/, 'must match assignment_date to booking job_date');

// Verify all three crew endpoints import and use the assignment check.
const uploadPhotoSource = readFileSync(new URL('../app/api/crew/upload-photo/route.js', import.meta.url), 'utf8');
assert.match(uploadPhotoSource, /isEmployeeAssignedToBooking/, 'upload-photo must check booking assignment');
assert.match(uploadPhotoSource, /Not assigned to this booking/, 'upload-photo must reject unassigned employees');
assert.match(uploadPhotoSource, /status: 403/, 'upload-photo must return 403 for unassigned');
// Photo upload safety: file size limit, MIME type check, category allowlist.
assert.match(uploadPhotoSource, /MAX_FILE_SIZE/, 'upload-photo must enforce file size limit');
assert.match(uploadPhotoSource, /photo\.size.*MAX_FILE_SIZE/, 'upload-photo must check photo.size against limit');
assert.match(uploadPhotoSource, /status: 413/, 'upload-photo must return 413 for oversized files');
assert.match(uploadPhotoSource, /photo\.type.*image\//, 'upload-photo must verify MIME type is image');
assert.match(uploadPhotoSource, /VALID_TYPES\.includes/, 'upload-photo must validate category against allowlist');
assert.match(uploadPhotoSource, /upsert: false/, 'upload-photo must not overwrite existing photos');

const collectPaymentSource = readFileSync(new URL('../app/api/crew/collect-payment/route.js', import.meta.url), 'utf8');
assert.match(collectPaymentSource, /isEmployeeAssignedToBooking/, 'collect-payment must check booking assignment');
assert.match(collectPaymentSource, /Not assigned to this booking/, 'collect-payment must reject unassigned employees');
assert.match(collectPaymentSource, /status: 403/, 'collect-payment must return 403 for unassigned');
assert.match(collectPaymentSource, /already paid/, 'collect-payment must reject duplicate payments');
assert.match(collectPaymentSource, /payment_status.*pending.*unpaid/, 'collect-payment must only allow pending/unpaid');
assert.match(collectPaymentSource, /status: 409/, 'collect-payment must return 409 for duplicate');
// Atomic conditional update (race condition protection).
assert.match(collectPaymentSource, /or\('payment_status\.in\.\(pending,unpaid\),payment_status\.is\.null'\)/, 'collect-payment must use atomic conditional update');
assert.match(collectPaymentSource, /concurrent update prevented/, 'collect-payment must report concurrent update prevention');
assert.match(collectPaymentSource, /updated\.length === 0/, 'collect-payment must check if 0 rows updated');

const resendLinkSource = readFileSync(new URL('../app/api/crew/resend-payment-link/route.js', import.meta.url), 'utf8');
assert.match(resendLinkSource, /isEmployeeAssignedToBooking/, 'resend-payment-link must check booking assignment');
assert.match(resendLinkSource, /Not assigned to this booking/, 'resend-payment-link must reject unassigned employees');
assert.match(resendLinkSource, /status: 403/, 'resend-payment-link must return 403 for unassigned');

// Legacy crew PIN auth must still work (bypasses assignment check).
assert.match(uploadPhotoSource, /crewAuth/, 'upload-photo must still accept crew PIN auth');
assert.match(collectPaymentSource, /crewAuth/, 'collect-payment must still accept crew PIN auth');
assert.match(resendLinkSource, /crewAuth/, 'resend-payment-link must still accept crew PIN auth');

// Employee session auth must be tried first, PIN as fallback.
assert.match(uploadPhotoSource, /getAuthedEmployee[\s\S]*!employee[\s\S]*crewAuth/, 'upload-photo must try employee session first');
assert.match(collectPaymentSource, /getAuthedEmployee[\s\S]*!employee[\s\S]*crewAuth/, 'collect-payment must try employee session first');
assert.match(resendLinkSource, /getAuthedEmployee[\s\S]*!employee[\s\S]*crewAuth/, 'resend-payment-link must try employee session first');

console.log('auth tests passed');
