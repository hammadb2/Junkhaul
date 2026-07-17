-- Route versioning and synchronization improvements.
--
-- 1. Add realtime publication for route_plans so the crew app can subscribe.
-- 2. Add device_id and route_version to route_acknowledgements for
--    idempotency and stale-version rejection.
-- 3. Add route_change_reason to route_plans for change summaries.
-- 4. Add requires_acknowledgment flag to route_plans.

-- 1. Enable realtime on route_plans.
ALTER PUBLICATION supabase_realtime ADD TABLE route_plans;

-- 2. Add device_id and route_version to route_acknowledgements.
ALTER TABLE route_acknowledgements
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS route_version INTEGER;

-- Add unique constraint for idempotent acknowledgments:
-- one ack per (route_plan_id, employee_id, route_version).
-- Duplicate acks from the same employee for the same version are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_ack_emp_version
  ON route_acknowledgements (route_plan_id, employee_id, route_version)
  WHERE route_version IS NOT NULL;

-- 3. Add route_change_reason to route_plans for change summaries.
ALTER TABLE route_plans
  ADD COLUMN IF NOT EXISTS route_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS route_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS route_updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Add route_version to crew_assignments for quick stale-check lookups.
-- This is the "current" version the crew should be operating on.
ALTER TABLE crew_assignments
  ADD COLUMN IF NOT EXISTS current_route_version INTEGER,
  ADD COLUMN IF NOT EXISTS current_route_plan_id UUID REFERENCES route_plans(id);
