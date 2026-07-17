-- ============================================================
-- Junk Haul Calgary — Growth Engine Migration
-- Date: 2026-07-08
-- Implements the Data & Growth Engine roadmap:
--   1. Leads table with abandonment tracking fields
--   2. UTM / click-ID capture columns
--   3. Nearby offers extended to support leads
--   4. Review request tracking
--   5. Referral system
--   6. Per-quadrant profit analytics view
-- ============================================================

-- ============================================================
-- 1. LEADS TABLE (if not already created via direct SQL)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  phone text NOT NULL,
  name text,
  email text,
  address text,
  lat double precision,
  lng double precision,
  quadrant text CHECK (quadrant IN ('NW','NE','SW','SE')),
  source text DEFAULT 'web',
  load_size text,
  ai_price_estimate integer,
  ai_weight_estimate_kg integer,
  photos text[],
  description_text text,
  converted_to_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  -- Abandonment sequence tracking (Step 1)
  follow_up_sent boolean DEFAULT false,
  follow_up_sent_at timestamp with time zone,
  abandonment_sms_sent boolean DEFAULT false,
  abandonment_sms_sent_at timestamp with time zone,
  final_reminder_sent boolean DEFAULT false,
  final_reminder_sent_at timestamp with time zone,
  quote_revealed_at timestamp with time zone,

  -- UTM / ad-click attribution (Step 2)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  gclid text,
  fbclid text,

  -- Opportunistic offer tracking (Step 3)
  opportunistic_offer_sent boolean DEFAULT false,
  opportunistic_offer_sent_at timestamp with time zone,
  opportunistic_cooldown_until timestamp with time zone,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON leads;
CREATE POLICY "Service role full access" ON leads
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads (phone);
CREATE INDEX IF NOT EXISTS leads_session_idx ON leads (session_id);
CREATE INDEX IF NOT EXISTS leads_converted_idx ON leads (converted_to_booking_id);
CREATE INDEX IF NOT EXISTS leads_lat_lng_idx ON leads (lat, lng);

-- ============================================================
-- 2. BOOKINGS — add repeat-customer / LTV / referral fields (Step 2, 7)
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id text,           -- links repeat bookings by phone
  ADD COLUMN IF NOT EXISTS referral_code text,          -- code used at booking
  ADD COLUMN IF NOT EXISTS referred_by_phone text;      -- phone of the referrer

-- ============================================================
-- 3. NEARBY OFFERS — add lead_id + discount fields (Step 3)
-- ============================================================
ALTER TABLE nearby_offers
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_type text DEFAULT 'waitlist'
    CHECK (offer_type IN ('waitlist','future_booking','lead','deadhead')),
  ADD COLUMN IF NOT EXISTS original_price integer,
  ADD COLUMN IF NOT EXISTS discounted_price integer,
  ADD COLUMN IF NOT EXISTS discount_percent integer;

-- ============================================================
-- 4. REFERRALS TABLE (Step 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_phone text NOT NULL,
  referee_phone text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  referrer_reward_amount integer DEFAULT 20,
  referee_reward_amount integer DEFAULT 20,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON referrals;
CREATE POLICY "Service role full access" ON referrals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_phone);
CREATE INDEX IF NOT EXISTS referrals_referee_idx ON referrals (referee_phone);

-- ============================================================
-- 5. QUADRANT PROFIT VIEW (Step 6)
-- ============================================================
DROP VIEW IF EXISTS quadrant_profit_v;
CREATE OR REPLACE VIEW quadrant_profit_v AS
SELECT
  quadrant,
  job_date,
  COUNT(*) AS job_count,
  SUM(total_price) AS total_revenue,
  AVG(total_price) AS avg_revenue,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_jobs,
  COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_jobs
FROM bookings
WHERE quadrant IS NOT NULL
GROUP BY quadrant, job_date
ORDER BY quadrant, job_date DESC;

-- ============================================================
-- 6. LEAD SCORING VIEW (Step 2 — pre-booking lead quality)
-- ============================================================
DROP VIEW IF EXISTS lead_quality_v;
CREATE OR REPLACE VIEW lead_quality_v AS
SELECT
  l.*,
  CASE
    WHEN l.ai_price_estimate >= 240 THEN 'high_value'
    WHEN l.ai_price_estimate >= 160 THEN 'medium_value'
    WHEN l.ai_price_estimate IS NOT NULL THEN 'low_value'
    ELSE 'unknown'
  END AS lead_value_tier,
  CASE
    WHEN l.converted_to_booking_id IS NOT NULL THEN true
    ELSE false
  END AS is_converted
FROM leads l;

-- ============================================================
-- 7. CUSTOMER LTV VIEW (Step 2 — lifetime value by phone)
-- ============================================================
DROP VIEW IF EXISTS customer_ltv_v;
CREATE OR REPLACE VIEW customer_ltv_v AS
SELECT
  phone,
  MAX(name) AS name,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings,
  SUM(total_price) FILTER (WHERE status = 'completed') AS lifetime_value,
  AVG(total_price) FILTER (WHERE status = 'completed') AS avg_job_value,
  MIN(created_at) AS first_booking,
  MAX(created_at) AS most_recent_booking,
  MAX(job_date) AS most_recent_job_date
FROM bookings
GROUP BY phone
ORDER BY lifetime_value DESC NULLS LAST;

-- ============================================================
-- 8. PG_CRON JOBS (Growth Engine crons)
--    Vercel Hobby only allows daily cron jobs, so we use
--    Supabase pg_cron + pg_net to call the app endpoints.
-- ============================================================
DO $$ BEGIN PERFORM cron.unschedule('abandonment-followup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'abandonment-followup',
  '*/30 * * * *',  -- every 30 minutes
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/abandonment-followup',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

DO $$ BEGIN PERFORM cron.unschedule('opportunistic-offer-live'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'opportunistic-offer-live',
  '*/5 * * * *',  -- every 5 minutes while truck is active
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/opportunistic-offer?mode=live',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

DO $$ BEGIN PERFORM cron.unschedule('opportunistic-offer-proactive'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'opportunistic-offer-proactive',
  '0 8 * * *',  -- 8 AM daily
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/opportunistic-offer?mode=proactive',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);

DO $$ BEGIN PERFORM cron.unschedule('review-request'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'review-request',
  '0 * * * *',  -- hourly
  $$
  SELECT content FROM (
    SELECT net.http_get(
      url := 'https://junkhaul.ca/api/cron/review-request',
      headers := json_build_object('x-cron-secret', 'faa08af17ef626c983a22c19ce1276376baae1bf70e60252')
    ) AS content
  ) t;
  $$
);
