// ============================================================
// Rehaul order-transition policy (audit finding H1).
//
// The public POST /api/rehaul/orders endpoint let any caller move any order
// to any status with no auth and no ownership check — including `paid` (free
// merchandise) and `refunded_by_authorized_exception` (arbitrary refunds).
//
// Until Rehaul commerce is actually built (real payment collection + staff
// RBAC + ownership — see audit H2/H3), money-affecting statuses must NOT be
// reachable over HTTP at all: `paid` can only ever be the result of a real
// payment event, and an authorized-exception refund is a staff action. This
// policy is enforced at the route boundary, not inside transitionOrderStatus,
// so a future server-side payment/admin flow can still set these directly.
//
// Kept dependency-free so it's unit-testable without the Supabase chain.
// ============================================================
export const MONEY_AFFECTING_ORDER_STATUSES = new Set([
  'paid',
  'refunded_by_authorized_exception',
]);

export function isMoneyAffectingTransition(toStatus) {
  return MONEY_AFFECTING_ORDER_STATUSES.has(toStatus);
}
