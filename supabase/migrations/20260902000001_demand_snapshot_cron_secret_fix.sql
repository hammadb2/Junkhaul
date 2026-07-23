-- ============================================================
-- Fix the demand-snapshot pg_cron job: it was scheduled with the
-- literal, never-interpolated placeholder string '{CRON_SECRET}' as
-- its x-cron-secret header (20260709_surge_pricing.sql:62), not a
-- real secret value (audit E2). checkCronSecret rejects it every
-- time (401), so demand snapshots have never actually been recorded
-- since this job was first scheduled -- surge pricing has been
-- running permanently on its bootstrap fallback instead of real
-- fill-velocity data.
--
-- Since applied migrations are immutable, this re-schedules the same
-- job (same name, same 6-hour cadence, same URL) with the corrected
-- current_setting('app.cron_secret', true) pattern from the E1 fix
-- (20260830000001_cron_secret_from_guc.sql), evaluated fresh at
-- cron-fire time rather than a hardcoded/placeholder literal.
-- ============================================================

DO $$ BEGIN PERFORM cron.unschedule('demand-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'demand-snapshot',
  '0 */6 * * *',  -- every 6 hours
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/demand-snapshot',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);
