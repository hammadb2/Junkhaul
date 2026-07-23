-- ============================================================
-- Stop hardcoding CRON_SECRET as a literal string inside pg_cron job
-- bodies (audit E1). Every cron.schedule() added across
-- 20260707_employee_portal.sql, 20260708_growth_engine.sql,
-- 20260819000001_at_risk_24h_cron.sql and
-- 20260822000003_fuel_price_refresh_cron.sql hardcoded the same
-- secret literal directly in the net.http_get() headers, instead of
-- reading it from a GUC. 20260707_employee_portal.sql *looks* like it
-- reads app.cron_secret via a DO block, but that DO block's local
-- variable never reaches the cron.schedule() calls below it -- it's
-- a separate statement with its own scope -- so every job's header
-- was independently hardcoded regardless.
--
-- This migration unschedules and re-schedules every affected job so
-- each job body calls current_setting('app.cron_secret', true)
-- itself, evaluated fresh at cron-fire time, not at migration-apply
-- time. Applied migrations are immutable, so the fix has to happen
-- here rather than by editing the original files.
--
-- This migration is a no-op for what the jobs *do* -- same job
-- names, same schedules, same URLs -- it only changes where the
-- secret comes from. It does NOT rotate the leaked secret value;
-- that requires setting a new value for the app.cron_secret Postgres
-- GUC and the CRON_SECRET Vercel env var, which only the project
-- owner can do.
-- ============================================================

-- 1. refresh-rates-jan
DO $$ BEGIN PERFORM cron.unschedule('refresh-rates-jan'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-rates-jan',
  '0 6 1 1 *',  -- Jan 1, 6am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-rates',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 2. refresh-rates-jul
DO $$ BEGIN PERFORM cron.unschedule('refresh-rates-jul'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-rates-jul',
  '0 6 1 7 *',  -- Jul 1, 6am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-rates',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 3. run-payroll
DO $$ BEGIN PERFORM cron.unschedule('run-payroll'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'run-payroll',
  '0 9 * * 5',  -- every Friday, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/run-payroll',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 4. remittance-reminder
DO $$ BEGIN PERFORM cron.unschedule('remittance-reminder'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'remittance-reminder',
  '0 9 10 * *',  -- 10th of every month, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/remittance-reminder',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 5. generate-t4s
DO $$ BEGIN PERFORM cron.unschedule('generate-t4s'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'generate-t4s',
  '0 9 31 1 *',  -- Jan 31, 9am
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/generate-t4s',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 6. abandonment-followup
DO $$ BEGIN PERFORM cron.unschedule('abandonment-followup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'abandonment-followup',
  '*/30 * * * *',  -- every 30 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/abandonment-followup',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 7. opportunistic-offer-live
DO $$ BEGIN PERFORM cron.unschedule('opportunistic-offer-live'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'opportunistic-offer-live',
  '*/5 * * * *',  -- every 5 minutes while truck is active
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/opportunistic-offer?mode=live',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 8. opportunistic-offer-proactive
DO $$ BEGIN PERFORM cron.unschedule('opportunistic-offer-proactive'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'opportunistic-offer-proactive',
  '0 8 * * *',  -- 8 AM daily
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/opportunistic-offer?mode=proactive',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 9. review-request
DO $$ BEGIN PERFORM cron.unschedule('review-request'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'review-request',
  '0 * * * *',  -- hourly
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/review-request',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 10. at-risk-24h
DO $$ BEGIN PERFORM cron.unschedule('at-risk-24h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'at-risk-24h',
  '*/30 * * * *',  -- every 30 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/at-risk-24h',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);

-- 11. refresh-fuel-price
DO $$ BEGIN PERFORM cron.unschedule('refresh-fuel-price'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'refresh-fuel-price',
  '0 */12 * * *',  -- every 12 hours
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/refresh-fuel-price',
      headers := json_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    ) AS content
  ) t;
  $$
);
