-- Route RLS policies and audit-event correction.
--
-- This migration is forward-only and comes after 20260718000001_route_versioning.sql
-- (which has already been applied to production).
--
-- 1. Add RLS policies so authenticated employees can subscribe to realtime
--    updates on route_plans for their own crew assignments.
-- 2. Add RLS policies on route_acknowledgements for the same.
-- 3. Enable RLS on crew_assignments (currently unprotected).
-- 4. Add route_acknowledgment_audit helper function for writing to audit_events.

-- 1. RLS policies on route_plans for authenticated employees.
-- Employees can see route plans for crew assignments where they are the
-- driver or secondary.
CREATE POLICY "employee_own_route_plans"
  ON route_plans FOR SELECT TO authenticated
  USING (
    crew_assignment_id IN (
      SELECT id FROM crew_assignments
      WHERE driver_employee_id = auth.uid()
         OR secondary_employee_id = auth.uid()
    )
  );

-- 2. RLS policies on route_acknowledgements for authenticated employees.
CREATE POLICY "employee_own_route_acks"
  ON route_acknowledgements FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
  );

CREATE POLICY "employee_insert_own_route_acks"
  ON route_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
  );

-- 3. Enable RLS on crew_assignments.
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;

-- Employees can see their own crew assignments.
CREATE POLICY "employee_own_crew_assignments"
  ON crew_assignments FOR SELECT TO authenticated
  USING (
    driver_employee_id = auth.uid()
    OR secondary_employee_id = auth.uid()
  );

-- 4. Add a helper function for writing route acknowledgment audit events.
-- This uses the established audit_events table, not geofence_events.
CREATE OR REPLACE FUNCTION log_route_acknowledgment(
  p_route_plan_id UUID,
  p_route_version INTEGER,
  p_employee_id UUID,
  p_device_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    event_type,
    actor_type,
    actor_id,
    source,
    metadata
  ) VALUES (
    'route_plan',
    p_route_plan_id,
    'route_acknowledged',
    'employee',
    p_employee_id,
    'crew_app',
    jsonb_build_object(
      'route_version', p_route_version,
      'device_id', p_device_id,
      'acknowledged_at', now()
    )
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
