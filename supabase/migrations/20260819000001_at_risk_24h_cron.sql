-- ============================================================
-- Schedule the 24-hour-guarantee at-risk check via pg_cron + pg_net,
-- calling the existing app/api/cron/at-risk-24h route directly - same
-- pattern already used for abandonment-followup, opportunistic-offer-live,
-- demand-snapshot, etc. (see 20260708_growth_engine.sql,
-- 20260709_surge_pricing.sql), specifically because Vercel's Hobby plan
-- rejects any vercel.json cron more frequent than once/day. The
-- vercel.json entry for this route has been removed in the same change
-- that adds this migration.
-- ============================================================

DO $$ BEGIN PERFORM cron.unschedule('at-risk-24h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'at-risk-24h',
  '*/30 * * * *',  -- every 30 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/at-risk-24h',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);
