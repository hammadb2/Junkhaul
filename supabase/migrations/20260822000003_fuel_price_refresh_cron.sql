-- ============================================================
-- Schedule the live fuel-price refresh via pg_cron + pg_net, calling
-- app/api/cron/refresh-fuel-price directly - same pattern already used
-- for abandonment-followup, opportunistic-offer-live, demand-snapshot,
-- and at-risk-24h (see 20260708_growth_engine.sql,
-- 20260709_surge_pricing.sql, 20260819000001_at_risk_24h_cron.sql):
-- Vercel's Hobby plan rejects any vercel.json cron more frequent than
-- once/day, so anything needing tighter cadence bypasses Vercel Cron
-- entirely and goes through pg_cron -> pg_net -> the app route.
--
-- NRCan's own source data only updates once a day, so twice-daily is
-- more than enough to pick up a new price promptly without hammering
-- their server - adjust the schedule below if that changes.
-- ============================================================

DO $$ BEGIN PERFORM cron.unschedule('refresh-fuel-price'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-fuel-price',
  '0 */12 * * *',  -- every 12 hours
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-fuel-price',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);
