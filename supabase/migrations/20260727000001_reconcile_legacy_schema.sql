-- ============================================================
-- Junkhaul legacy schema reconciliation
-- Forward-only migration.
--
-- Purpose:
-- Historical migrations are immutable after being applied. This migration
-- carries compatibility/idempotency reconciliation that was discovered while
-- verifying the customer/admin foundation against an existing Supabase schema.
--
-- Do not move these fixes back into older migration files.
-- ============================================================

-- ---------- Crew app policies/publication ----------
DROP POLICY IF EXISTS "Service role full access" ON crew_location;
CREATE POLICY "Service role full access" ON crew_location
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anon read active sessions only" ON crew_location;
CREATE POLICY "Anon read active sessions only" ON crew_location
  FOR SELECT USING (updated_at > now() - interval '24 hours');

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crew_location;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Service role full access" ON nearby_offers;
CREATE POLICY "Service role full access" ON nearby_offers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON gps_overrides;
CREATE POLICY "Service role full access" ON gps_overrides
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON crew_pin;
CREATE POLICY "Service role full access" ON crew_pin
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can access call_history" ON call_history;
CREATE POLICY "Service role can access call_history" ON call_history FOR ALL USING (true);

-- ---------- Employee portal policies ----------
DROP POLICY IF EXISTS "Service role full access" ON employees;
CREATE POLICY "Service role full access" ON employees
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON employee_documents;
CREATE POLICY "Service role full access" ON employee_documents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON employee_sessions;
CREATE POLICY "Service role full access" ON employee_sessions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON timesheets;
CREATE POLICY "Service role full access" ON timesheets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON payroll_rates;
CREATE POLICY "Service role full access" ON payroll_rates
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON pay_runs;
CREATE POLICY "Service role full access" ON pay_runs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON pay_stubs;
CREATE POLICY "Service role full access" ON pay_stubs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON remittances;
CREATE POLICY "Service role full access" ON remittances
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON direct_deposit_log;
CREATE POLICY "Service role full access" ON direct_deposit_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON t4_slips;
CREATE POLICY "Service role full access" ON t4_slips
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- Growth/AI compatibility ----------
DROP POLICY IF EXISTS "Service role full access" ON referrals;
CREATE POLICY "Service role full access" ON referrals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

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

ALTER TABLE ai_agent_actions
  ADD COLUMN IF NOT EXISTS tool_name TEXT,
  ADD COLUMN IF NOT EXISTS arguments JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_created_at
  ON ai_agent_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_tool
  ON ai_agent_actions (tool_name);

UPDATE system_config
SET value_type = 'string'
WHERE key IN ('storage_facility_id', 'donation_center_id', 'oilpriceapi_key')
  AND value_type = 'text';

-- ---------- Route/crew/photo/safety policies ----------
DROP POLICY IF EXISTS "service_role_all_route_plans" ON route_plans;
CREATE POLICY "service_role_all_route_plans" ON route_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_route_acks" ON route_acknowledgements;
CREATE POLICY "service_role_all_route_acks" ON route_acknowledgements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_geofence" ON geofence_events;
CREATE POLICY "service_role_all_geofence" ON geofence_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_crew_photos" ON crew_photos;
CREATE POLICY "service_role_all_crew_photos" ON crew_photos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "crew_photos_public_read" ON storage.objects;
CREATE POLICY "crew_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'crew-photos');

DROP POLICY IF EXISTS "crew_photos_auth_write" ON storage.objects;
CREATE POLICY "crew_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crew-photos');

DROP POLICY IF EXISTS "crew_photos_service_write" ON storage.objects;
CREATE POLICY "crew_photos_service_write" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'crew-photos');

DROP POLICY IF EXISTS "safety_alerts_admin_read" ON safety_alerts;
CREATE POLICY "safety_alerts_admin_read" ON safety_alerts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "safety_alerts_admin_write" ON safety_alerts;
CREATE POLICY "safety_alerts_admin_write" ON safety_alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to safety_incidents" ON safety_incidents;
CREATE POLICY "Service role full access to safety_incidents"
  ON safety_incidents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Employees can create safety incidents" ON safety_incidents;
CREATE POLICY "Employees can create safety incidents"
  ON safety_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Employees can read their own safety incidents" ON safety_incidents;
CREATE POLICY "Employees can read their own safety incidents"
  ON safety_incidents FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

DROP TRIGGER IF EXISTS safety_incidents_updated_at ON safety_incidents;
CREATE TRIGGER safety_incidents_updated_at
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_incidents_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE safety_incidents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crew_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
