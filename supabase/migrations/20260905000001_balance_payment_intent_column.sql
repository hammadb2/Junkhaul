-- ============================================================
-- Give the balance PaymentIntent its own column (audit F7).
--
-- bookings.stripe_payment_intent_id was shared by both the deposit
-- flow (create-booking, sms-webhook, whatsapp-webhook,
-- admin/bookings, chatBookingTools, vapiTools -- all write the
-- deposit intent there) and app/api/crew/balance-payment, which
-- overwrote the SAME column with a balance intent whenever the
-- stored intent wasn't already a reusable balance intent (e.g. the
-- first time a customer opens their balance-payment link, the
-- column still holds the deposit intent).
--
-- That silently discarded the deposit intent reference two other
-- places depend on:
--   - app/api/pay/[id]/route.js reads it to resume an in-progress
--     deposit payment -- after an overwrite it would retrieve the
--     balance intent instead and hand back the wrong client_secret.
--   - lib/cancellations.js reads it to issue the DEPOSIT refund on
--     cancellation -- after an overwrite it would call
--     stripe.refunds.create against whatever the balance intent was,
--     refunding the wrong charge (or failing outright if that intent
--     was never confirmed).
--
-- A separate column removes the overwrite entirely; each flow now
-- owns its own intent reference.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id text;
