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

// ============================================================
// Maps a crew-selected payment method (from the signature step —
// app/api/employee/signature) to constraint-valid bookings fields.
//
// Only 'cash' represents a payment this app actually collected — it mirrors
// what app/api/crew/collect-payment independently and correctly records for
// cash. The crew app's other options ('cardOnFile'/'card_on_file',
// 'smsLink') have no backing Stripe charge in this codebase, so they must
// NOT be mapped to any paid_* status: doing so would falsely claim money was
// collected. Returning {} leaves the booking's existing payment_status
// (e.g. already paid_card from an online balance payment, or still unpaid)
// untouched, which is the honest result (audit F2).
// ============================================================
export function bookingPaymentFields(rawMethod) {
  if (rawMethod === 'cash') return { payment_status: 'cash_crew', payment_method: 'cash' };
  return {};
}
