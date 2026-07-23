-- ============================================================
-- Schedule the day-of reminder SMS via pg_cron + pg_net, calling
-- app/api/cron/day-of-reminder directly - same pattern already used
-- for abandonment-followup, opportunistic-offer-live, and
-- at-risk-24h (see 20260708_growth_engine.sql,
-- 20260819000001_at_risk_24h_cron.sql): Vercel's Hobby plan rejects
-- any vercel.json cron more frequent than once/day, so anything
-- needing tighter cadence bypasses Vercel Cron and goes through
-- pg_cron -> pg_net -> the app route.
--
-- Every 30 minutes (not once at a fixed morning time) so same-day
-- bookings confirmed after the first run still get their reminder
-- shortly after confirmation, not just customers who booked in
-- advance (audit A2/A3). The route's own morning_reminder_sent
-- guard makes re-running idempotent.
--
-- Per the E1 fix (20260830000001_cron_secret_from_guc.sql), the
-- secret is read fresh at cron-fire time via
-- current_setting('app.cron_secret', true) rather than hardcoded.
-- ============================================================

DO $$ BEGIN PERFORM cron.unschedule('day-of-reminder'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'day-of-reminder',
  '*/30 * * * *',  -- every 30 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/day-of-reminder',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);
