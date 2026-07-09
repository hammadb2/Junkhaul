-- ============================================================
-- Junk Haul Calgary — Surge Pricing Migration
-- Date: 2026-07-09
-- Adds real-time, demand-based surge pricing on top of the
-- existing static -5% early-bird discount:
--   1. slot_demand_snapshots — historical fill-rate baseline
--   2. bookings.surge_multiplier / surge_mode — observability
--   3. pg_cron job: demand-snapshot, every 6 hours
--
-- SECURITY NOTE: unlike the previous growth-engine migration,
-- the cron secret below is a PLACEHOLDER. Replace {CRON_SECRET}
-- with the actual value of your CRON_SECRET env var before
-- running this in the SQL editor, and do not commit the filled-in
-- value back to git. (The prior migration hardcoded the real
-- secret in plaintext — recommend rotating that secret and
-- scrubbing it from git history if the repo has ever been pushed
-- to a remote.)
-- ============================================================

-- ============================================================
-- 1. SLOT DEMAND SNAPSHOTS — historical baseline for surge pricing
-- ============================================================
CREATE TABLE IF NOT EXISTS slot_demand_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  day_type text,
  jobs_booked integer NOT NULL,
  max_jobs integer NOT NULL,
  fill_ratio double precision NOT NULL,
  days_out integer NOT NULL,
  days_out_bucket text NOT NULL CHECK (days_out_bucket IN ('0-1','2-3','4-7','8+')),
  snapshot_at timestamp with time zone DEFAULT now()
);

ALTER TABLE slot_demand_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON slot_demand_snapshots;
CREATE POLICY "Service role full access" ON slot_demand_snapshots
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS slot_demand_snapshots_lookup_idx
  ON slot_demand_snapshots (day_type, slot_time, days_out_bucket);

-- ============================================================
-- 2. BOOKINGS — surge observability columns
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS surge_multiplier double precision DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS surge_mode text; -- 'no_slot_data' | 'bootstrap' | 'learned'

-- ============================================================
-- 3. PG_CRON JOB — demand snapshot every 6 hours
-- ============================================================
DO $$ BEGIN PERFORM cron.unschedule('demand-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'demand-snapshot',
  '0 */6 * * *',  -- every 6 hours
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/demand-snapshot',
      headers := json_build_object('x-cron-secret', '{CRON_SECRET}')
    ) AS content
  ) t;
  $$
);
