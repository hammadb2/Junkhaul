-- ============================================================
-- Junk Haul Calgary — Supabase Cron jobs (pg_cron + pg_net)
-- Run in the Supabase SQL Editor AFTER deploying the edge functions.
--
-- Replace the two placeholders below before running:
--   {SUPABASE_URL}       e.g. https://mvsopvphpuucrbuqsfky.supabase.co
--   {SUPABASE_ANON_KEY}  your project anon key
--
-- TIMEZONE NOTE: pg_cron fires in UTC. Calgary is America/Edmonton (MST/MDT),
-- which shifts with daylight saving. Rather than hard-code a UTC hour that
-- breaks twice a year, most jobs run every hour (or 30 min) and the edge
-- function itself guards on the correct America/Edmonton local time. This is
-- DST-proof. See supabase/functions/_shared/time.ts.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Helper: unschedule if it already exists (safe re-run)
select cron.unschedule(jobname) from cron.job
where jobname in (
  'generate-weekly-slots','morning-reminders','operator-day-summary',
  'review-requests','no-show-check','risk-reminders','waitlist-cleanup'
);

-- ── CRON 1: Generate slots (Mondays ~5AM Edmonton; guarded in-function) ──
select cron.schedule(
  'generate-weekly-slots',
  '0 * * * 1',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/generate-slots',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 2: Morning reminders (7AM Edmonton; guarded) ──
select cron.schedule(
  'morning-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/morning-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 3: Operator day summary (6:30AM Edmonton, Thu/Sun; guarded) ──
select cron.schedule(
  'operator-day-summary',
  '30 * * * *',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/day-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 4: Review requests (every 30 min) ──
select cron.schedule(
  'review-requests',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/review-requests',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 5: No-show check (every 30 min; guarded to 7AM-5PM Edmonton) ──
select cron.schedule(
  'no-show-check',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/no-show-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 6: Extra risk reminders (8PM Edmonton; guarded) ──
select cron.schedule(
  'risk-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := '{SUPABASE_URL}/functions/v1/risk-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {SUPABASE_ANON_KEY}',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- ── CRON 7: Waitlist expiry cleanup (every hour, pure SQL) ──
select cron.schedule(
  'waitlist-cleanup',
  '0 * * * *',
  $$
  update waitlist
  set notified = false
  where notified = true
    and expires_at < now()
    and converted_to_booking_id is null;
  $$
);
