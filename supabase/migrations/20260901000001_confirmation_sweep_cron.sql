-- ============================================================
-- Recovery sweep for stuck booking confirmations (audit F3/B4).
--
-- app/api/stripe-webhook/route.js always returns HTTP 200 even when an
-- internal step fails (deliberately, to stop Stripe from hammering
-- retries on our own bugs), which means Stripe never re-delivers a
-- payment_intent.succeeded event just because handleBookingConfirmed
-- failed partway through. Once deposit_paid was set true, there was
-- previously no other path that ever called handleBookingConfirmed for
-- that booking again -- a transient failure (e.g. an SMS-suppressed
-- number) permanently dropped the customer confirmation and operator
-- alert.
--
-- This schedules app/api/cron/confirmation-sweep, which finds bookings
-- stuck in that state (deposit_paid=true, confirmation_sms_sent=false,
-- not cancelled, older than 5 minutes) and retries them.
--
-- Every 15 minutes via pg_cron -> pg_net, same pattern as
-- abandonment-followup/at-risk-24h/day-of-reminder, using the corrected
-- current_setting('app.cron_secret', true) pattern from the E1 fix
-- rather than a hardcoded secret.
-- ============================================================

INSERT INTO system_config (key, value, value_type, description, category)
VALUES
  ('kill_switch_confirmation_sweep', 'true', 'boolean', 'Enable the stuck-booking-confirmation recovery sweep', 'kill_switch')
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN PERFORM cron.unschedule('confirmation-sweep'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'confirmation-sweep',
  '*/15 * * * *',  -- every 15 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/confirmation-sweep',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);
