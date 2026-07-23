import assert from 'node:assert/strict';
import { callerOwnsBooking } from '../lib/callerAuth.js';

// ============================================================
// Voice-agent caller-identity gate (audit findings C2/F6).
// A phone caller may only act on a booking that belongs to the number they
// are calling from. callerOwnsBooking is the predicate every account-action
// tool (lookup/cancel/reschedule/refund) checks before doing anything.
// ============================================================

// --- Matches across the phone formats Vapi and the DB actually use ---
assert.equal(callerOwnsBooking('+15871234567', '+15871234567'), true, 'identical E.164 matches');
assert.equal(callerOwnsBooking('5871234567', '+15871234567'), true, '10-digit caller matches E.164 booking');
assert.equal(callerOwnsBooking('15871234567', '+15871234567'), true, '11-digit caller matches E.164 booking');
assert.equal(callerOwnsBooking('(587) 123-4567', '+15871234567'), true, 'formatted caller matches E.164 booking');

// --- Rejects a different number: the core of the fix ---
assert.equal(callerOwnsBooking('+15879999999', '+15871234567'), false, 'different number is rejected');

// --- Fails closed on blocked/withheld/empty caller ID ---
assert.equal(callerOwnsBooking('', '+15871234567'), false, 'empty caller fails closed');
assert.equal(callerOwnsBooking(null, '+15871234567'), false, 'null caller fails closed');
assert.equal(callerOwnsBooking(undefined, '+15871234567'), false, 'undefined caller fails closed');

// --- Fails closed when the booking has no usable phone on file ---
assert.equal(callerOwnsBooking('+15871234567', ''), false, 'empty booking phone fails closed');
assert.equal(callerOwnsBooking('+15871234567', null), false, 'null booking phone fails closed');

// --- Two empties must never be treated as a match ---
assert.equal(callerOwnsBooking('', ''), false, 'empty vs empty is not a match');
assert.equal(callerOwnsBooking(null, null), false, 'null vs null is not a match');

console.log('vapiCallerAuth tests passed');
