-- ============================================================
-- Add a uniqueness guard on crew_tips.stripe_payment_intent_id
-- (audit F5). Needed so the Stripe webhook's tip-recording insert
-- (app/api/stripe-webhook/route.js) can safely no-op on a Stripe
-- event redelivery instead of inserting a second row for the same
-- charge -- the webhook checks for Postgres error code 23505 (unique
-- violation) to detect that case.
--
-- Confirmed against the live database before writing this: crew_tips
-- currently has zero rows with a non-null stripe_payment_intent_id,
-- so there is nothing for this constraint to conflict with.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS crew_tips_stripe_payment_intent_id_idx
  ON crew_tips (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
