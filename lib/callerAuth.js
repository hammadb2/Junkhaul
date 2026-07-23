import { normalizePhone } from './phone.js';

// ============================================================
// Caller-identity gate for phone account actions (audit findings C2/F6).
//
// A phone caller may only look up, change, cancel, or refund a booking that
// belongs to the number they are calling from. app/api/vapi/route.js injects
// the caller's number as `_caller_phone` on every tool call; handlers compare
// it to the booking's stored phone with the same normalization the rest of the
// app uses. Blocked/withheld caller ID arrives empty, which fails closed.
//
// Kept in its own dependency-light module (only ./phone) so the security
// predicate is unit-testable without pulling in the Supabase/Stripe chain that
// lib/vapiTools.js needs.
// ============================================================
export function callerOwnsBooking(callerPhone, bookingPhone) {
  const caller = normalizePhone(callerPhone || '');
  const owner = normalizePhone(bookingPhone || '');
  return Boolean(caller && owner && caller === owner);
}

export const CALLER_MISMATCH_MESSAGE =
  "For your security I can only make changes to a booking from the phone number it was made with. If you're calling from a different number, I can have a team member call you back to help.";
