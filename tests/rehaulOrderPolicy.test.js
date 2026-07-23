import assert from 'node:assert/strict';
import { isMoneyAffectingTransition, MONEY_AFFECTING_ORDER_STATUSES } from '../lib/rehaulOrderPolicy.js';

// ============================================================
// Rehaul order-transition policy (audit finding H1).
// The public orders endpoint must never let a caller reach a money-affecting
// status. These are the exact statuses that grant goods or move money in the
// rehaul_orders state machine (lib/rehaulOrders.js).
// ============================================================

// --- The two money-affecting statuses are blocked ---
assert.equal(isMoneyAffectingTransition('paid'), true, 'paid is money-affecting');
assert.equal(isMoneyAffectingTransition('refunded_by_authorized_exception'), true, 'authorized refund is money-affecting');

// --- Fulfillment-workflow statuses are allowed through the endpoint ---
for (const s of ['scheduled', 'picking', 'loaded', 'out_for_delivery', 'delivered', 'exception', 'statutory_remedy_review', 'cancelled_by_business']) {
  assert.equal(isMoneyAffectingTransition(s), false, `${s} is not money-affecting`);
}

// --- Unknown / empty inputs are not money-affecting (route still 400s them downstream) ---
assert.equal(isMoneyAffectingTransition(''), false, 'empty string is not money-affecting');
assert.equal(isMoneyAffectingTransition(undefined), false, 'undefined is not money-affecting');
assert.equal(isMoneyAffectingTransition('PAID'), false, 'match is case-sensitive by design (exact status strings)');

// --- The blocked set is exactly these two, so the guard can't silently widen/narrow ---
assert.deepEqual([...MONEY_AFFECTING_ORDER_STATUSES].sort(), ['paid', 'refunded_by_authorized_exception']);

console.log('rehaulOrderPolicy tests passed');
