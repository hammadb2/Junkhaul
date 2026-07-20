-- ============================================================
-- Junkhaul Calgary — Dispatch control centre schema
-- Date: 2026-08-06
--
-- Adds publish/rollback/scenario tracking and dispatch exception log.
-- ============================================================

ALTER TABLE route_plans
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_reason TEXT,
  ADD COLUMN IF NOT EXISTS scenario_of UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rolled_back_to UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rolled_back_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_route_plans_scenario ON route_plans(scenario_of);
CREATE INDEX IF NOT EXISTS idx_route_plans_published ON route_plans(published_at, route_status);

CREATE TABLE IF NOT EXISTS dispatch_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('under_margin','overweight','over_volume','late_return','missing_evidence','facility_closed','crew_overtime','contamination_conflict','route_infeasible')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  description TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_exceptions_route ON dispatch_exceptions(route_plan_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_exceptions_unresolved ON dispatch_exceptions(route_plan_id, acknowledged, severity);

ALTER TABLE dispatch_exceptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispatch_exceptions' AND policyname = 'service_role_all_dispatch_exceptions') THEN
    CREATE POLICY service_role_all_dispatch_exceptions ON dispatch_exceptions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
