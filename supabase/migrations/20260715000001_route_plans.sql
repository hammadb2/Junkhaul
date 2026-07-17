-- ============================================================
-- 20260715000001_route_plans.sql
--
-- Phase 1 of the Junkhaul crew map architecture.
--
-- Tables:
--   route_plans           — optimized stop sequences per crew assignment
--   route_acknowledgements— device receipts that a crew received a plan
--   geofence_events       — arrived / departed / landfill_arrived pings
--
-- RLS: service_role has full access (server-side only). anon/authenticated
-- get nothing directly — all reads go through the Next.js API layer which
-- uses the service role and gates on employee identity.
-- ============================================================

CREATE TABLE IF NOT EXISTS route_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_assignment_id UUID REFERENCES crew_assignments(id),
  route_version INTEGER NOT NULL DEFAULT 1,
  crew_id TEXT,
  current_stop_id TEXT,
  stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_reason TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(crew_assignment_id, route_version)
);

-- Track route delivery acknowledgements from devices
CREATE TABLE IF NOT EXISTS route_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id UUID REFERENCES route_plans(id),
  employee_id UUID REFERENCES employees(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_online BOOLEAN DEFAULT true
);

-- Track geofence events
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  booking_id TEXT,
  event_type TEXT NOT NULL, -- 'arrived', 'departed', 'landfill_arrived'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_route_plans" ON route_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_route_acks" ON route_acknowledgements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_geofence" ON geofence_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
