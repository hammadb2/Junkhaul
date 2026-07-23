import assert from 'node:assert/strict';
import { isPaidStatus, PAID_STATUSES } from '../lib/paymentStatus.js';

// ============================================================
// Booking payment_status vocabulary (audit F1/F2/G3).
// These must match the bookings_payment_status_check constraint exactly.
// ============================================================

// Collected-money statuses are recognized as paid
for (const s of ['paid_card', 'paid_apple_pay', 'paid_google_pay', 'cash_crew']) {
  assert.equal(isPaidStatus(s), true, `${s} is paid`);
}

// Not-yet-collected / invalid values are not paid
assert.equal(isPaidStatus('unpaid'), false, 'unpaid is not paid');
assert.equal(isPaidStatus('cash_declared'), false, 'cash_declared is a promise, not collected');

// The classic bug: plain 'paid' is NOT a constraint-valid value and must
// never be treated as paid (writing it is silently rejected by the DB).
assert.equal(isPaidStatus('paid'), false, "'paid' is not a valid status");

// Defensive: empty / nullish
assert.equal(isPaidStatus(''), false, 'empty is not paid');
assert.equal(isPaidStatus(undefined), false, 'undefined is not paid');
assert.equal(isPaidStatus(null), false, 'null is not paid');

// The set is exactly these four collected states, so it can't silently drift
assert.deepEqual([...PAID_STATUSES].sort(), ['cash_crew', 'paid_apple_pay', 'paid_card', 'paid_google_pay']);

console.log('paymentStatus tests passed');
