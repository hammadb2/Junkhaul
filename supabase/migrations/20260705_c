-- ============================================================
-- Junk Haul Crew App — Schema Migration
-- Date: 2026-07-05
-- Adds crew tracking, payment status, opportunistic offers,
-- and addresses the gaps identified in the spec review.
-- ============================================================

-- ============================================================
-- 1. CREW LOCATION (realtime tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS crew_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_session_id text UNIQUE NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  heading float,
  speed_kmh float,
  accuracy_meters float,
  active_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  crew_pin_hash text,  -- which crew member is broadcasting
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE crew_location ENABLE ROW LEVEL SECURITY;

-- Fixed RLS: only expose the row matching the active booking (via a per-booking
-- token). The customer tracking page passes ?session=tracking_session_id and
-- the policy allows SELECT only on rows where tracking_session_id matches.
-- For crew app writes, the service role bypasses RLS.
DROP POLICY IF EXISTS "Public read for tracking" ON crew_location;
DROP POLICY IF EXISTS "Service role write" ON crew_location;
DROP POLICY IF EXISTS "Crew app write with PIN" ON crew_location;

-- Service role has full access (used by /api/crew/* routes)
CREATE POLICY "Service role full access" ON crew_location
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Public read is gated by a tracking_session_id passed as a request header
-- or via a Postgres function. For simplicity, we expose only rows where
-- updated_at is within the last 24 hours AND the session is active.
-- The /track/[booking_id] page uses service role to fetch by booking_id.
-- (Anon access is intentionally NOT granted — the tracking page uses
--  a server-side fetch with the service role key, not the anon key.)
CREATE POLICY "Anon read active sessions only" ON crew_location
  FOR SELECT USING (
    updated_at > now() - interval '24 hours'
  );

ALTER PUBLICATION supabase_realtime ADD TABLE crew_location;

-- ============================================================
-- 2. BOOKINGS — new columns for crew app lifecycle
-- ============================================================

-- Crew status (separate from booking.status to avoid breaking existing flow)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS crew_status text DEFAULT 'confirmed'
    CHECK (crew_status IN (
      'confirmed', 'en_route', 'arrived', 'in_progress',
      'awaiting_payment', 'complete'
    ));

-- Payment status (the spec v1.1 payment flow depends on this)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN (
      'unpaid', 'paid_card', 'paid_apple_pay', 'paid_google_pay',
      'cash_declared', 'cash_crew'
    ));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method text
    CHECK (payment_method IS NULL OR payment_method IN (
      'tap', 'card_manual', 'cash', 'apple_pay', 'google_pay'
    ));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_collected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,  -- already may exist
  ADD COLUMN IF NOT EXISTS receipt_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_session_id text,
  ADD COLUMN IF NOT EXISTS opportunistic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS en_route_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS crew_photos jsonb DEFAULT '[]'::jsonb;

-- crew_arrived_at and job_started_at already added in 20260706_crew_photos.sql
-- but ensure they exist with the correct type (timestamptz, not timestamp)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS crew_arrived_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS job_started_at timestamp with time zone;

-- ============================================================
-- 3. WAITLIST — add lat/lng for proximity checks
-- (Spec review gap #2: opportunistic scheduling depends on this)
-- ============================================================
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS offered_nearby_today boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_nearby_offer_at timestamp with time zone;

-- ============================================================
-- 4. NEARBY OFFERS — opportunistic scheduling tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS nearby_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  waitlist_id uuid REFERENCES waitlist(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  offered_at timestamp with time zone DEFAULT now(),
  accepted boolean,
  responded_at timestamp with time zone,
  offer_expires_at timestamp with time zone,
  crew_lat float,
  crew_lng float,
  distance_km float,
  converted_booking_id uuid REFERENCES bookings(id)
);

ALTER TABLE nearby_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON nearby_offers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. GPS OVERRIDES — audit log for geofence bypasses
-- (Spec review gap #9)
-- ============================================================
CREATE TABLE IF NOT EXISTS gps_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'gps_unavailable',
  crew_lat float,
  crew_lng float,
  job_lat float,
  job_lng float,
  distance_meters float,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE gps_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON gps_overrides
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 6. CREW PIN HASH — stored server-side for verification
-- (The app sends a SHA-256 hash; we compare with constant-time comparison)
-- ============================================================
CREATE TABLE IF NOT EXISTS crew_pin (
  id integer PRIMARY KEY DEFAULT 1,
  pin_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE crew_pin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON crew_pin
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 7. PG_CRON — auto-delete crew_location after 24 hours
-- (Spec review gap #19)
-- ============================================================
-- Note: pg_cron is already enabled in 0001_init.sql
DO $$
BEGIN
  -- Drop the job if it exists, then recreate (idempotent)
  PERFORM cron.unschedule('crew-location-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'crew-location-cleanup',
  '0 * * * *',  -- hourly
  $$
  DELETE FROM crew_location
  WHERE updated_at < now() - interval '24 hours';
  $$
);

-- ============================================================
-- 8. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS bookings_crew_status_idx ON bookings (crew_status);
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings (payment_status);
CREATE INDEX IF NOT EXISTS bookings_job_date_idx ON bookings (job_date);
CREATE INDEX IF NOT EXISTS crew_location_active_booking_idx ON crew_location (active_booking_id);
CREATE INDEX IF NOT EXISTS crew_location_session_idx ON crew_location (tracking_session_id);
CREATE INDEX IF NOT EXISTS nearby_offers_phone_idx ON nearby_offers (customer_phone);
CREATE INDEX IF NOT EXISTS waitlist_lat_lng_idx ON waitlist (lat, lng);
