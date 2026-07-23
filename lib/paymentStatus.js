// ============================================================
// Booking payment_status vocabulary.
//
// The bookings_payment_status_check constraint (migration
// 20260705_crew_app.sql) only permits these values:
//   'unpaid', 'paid_card', 'paid_apple_pay', 'paid_google_pay',
//   'cash_declared', 'cash_crew'
//
// There is NO plain 'paid' value — writing it violates the constraint and
// the update is silently rejected. Several call sites assumed a 'paid'
// value existed (audit F1/F2/G3); this module is the single source of truth
// for "money has actually been collected".
//
// 'cash_declared' is deliberately excluded: it means the customer said they
// will pay cash on pickup, not that anything was collected yet.
// ============================================================
export const PAID_STATUSES = new Set([
  'paid_card',
  'paid_apple_pay',
  'paid_google_pay',
  'cash_crew',
]);

export function isPaidStatus(status) {
  return PAID_STATUSES.has(status);
}
