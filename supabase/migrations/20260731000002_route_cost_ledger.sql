-- ============================================================
-- 20260731000002_route_cost_ledger.sql
--
-- Phase 1 Task 3 — canonical route/job cost ledger.
--
-- Creates:
--   route_runs            — one execution of a route for a day/crew
--   route_stops           — ordered planned/actual stops inside a run
--   cost_ledger_entries   — every estimated, committed, and actual cost line
--   job_cost_allocations  — how a shared ledger entry is split across bookings
--   profitability_snapshots — immutable revenue/cost/margin snapshots
--   expense_receipts      — receipt images with OCR and verification
--
-- All money is stored in integer cents. No binary float is persisted.
-- ============================================================

-- ============================================================
-- 1. route_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS route_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  crew_assignment_id UUID NOT NULL REFERENCES crew_assignments(id),
  route_type TEXT NOT NULL CHECK (route_type IN ('junkhaul_dirty','rehaul_clean')),
  vehicle_profile_id UUID REFERENCES vehicle_profiles(id),
  rental_rate_version_id UUID REFERENCES rental_rate_versions(id),
  labor_rate_version_id UUID REFERENCES labor_rate_versions(id),
  fuel_rate_version_id UUID REFERENCES fuel_rate_versions(id),
  overhead_rate_version_id UUID REFERENCES overhead_rate_versions(id),
  pricing_policy_version_id UUID REFERENCES pricing_policy_versions(id),
  driver_employee_id UUID REFERENCES employees(id),
  secondary_employee_id UUID REFERENCES employees(id),
  planned_start_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  planned_distance_km NUMERIC DEFAULT 0,
  actual_distance_km NUMERIC DEFAULT 0,
  planned_duration_minutes INTEGER DEFAULT 0,
  actual_duration_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  source_versions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_route_runs_assignment ON route_runs(crew_assignment_id);
CREATE INDEX IF NOT EXISTS idx_route_runs_status ON route_runs(status);
CREATE INDEX IF NOT EXISTS idx_route_runs_date ON route_runs(planned_start_at);

-- ============================================================
-- 2. route_stops
-- ============================================================
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_run_id UUID NOT NULL REFERENCES route_runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('depot_start','customer','landfill','donation_drop','fuel','depot_end')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  address_snapshot TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,
  planned_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  planned_duration_minutes INTEGER DEFAULT 0,
  actual_duration_minutes INTEGER DEFAULT 0,
  planned_distance_from_previous_km NUMERIC DEFAULT 0,
  actual_distance_from_previous_km NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_route_stops_run ON route_stops(route_run_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_booking ON route_stops(booking_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_run_id, sequence);

-- ============================================================
-- 3. cost_ledger_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_run_id UUID REFERENCES route_runs(id) ON DELETE CASCADE,
  route_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'rental_base','rental_mileage','fuel','labor_wages','labor_burden','labor_overtime',
    'disposal_flat','disposal_per_tonne','disposal_surcharge','supplies','insurance','admin',
    'software','payment_fee','contingency','risk_reserve','other'
  )),
  phase TEXT NOT NULL CHECK (phase IN ('estimated','committed','actual')),
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_cost_cents INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  tax_cents INTEGER DEFAULT 0,
  evidence JSONB DEFAULT '{}'::jsonb,
  source_versions JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_run ON cost_ledger_entries(route_run_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_booking ON cost_ledger_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_category ON cost_ledger_entries(category);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_phase ON cost_ledger_entries(phase);

-- ============================================================
-- 4. job_cost_allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS job_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_ledger_entry_id UUID NOT NULL REFERENCES cost_ledger_entries(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL DEFAULT 'booking',
  reference_id UUID,
  allocation_method TEXT NOT NULL CHECK (allocation_method IN ('km','time','weight','volume','hybrid','equal','single','revenue')),
  allocated_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_allocations_entry ON job_cost_allocations(cost_ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_job_allocations_booking ON job_cost_allocations(booking_id);

-- ============================================================
-- 5. profitability_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_run_id UUID REFERENCES route_runs(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('route','booking')),
  revenue_cents INTEGER DEFAULT 0,
  direct_cost_cents INTEGER DEFAULT 0,
  contribution_cents INTEGER DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  risk_buffer_cents INTEGER DEFAULT 0,
  decision TEXT CHECK (decision IN ('accept','review','reject')),
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profitability_run ON profitability_snapshots(route_run_id);
CREATE INDEX IF NOT EXISTS idx_profitability_booking ON profitability_snapshots(booking_id);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshot_type ON profitability_snapshots(snapshot_type);

-- ============================================================
-- 6. expense_receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_run_id UUID REFERENCES route_runs(id) ON DELETE SET NULL,
  route_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  receipt_image_url TEXT,
  ocr_raw JSONB DEFAULT '{}'::jsonb,
  ocr_vendor TEXT,
  ocr_confidence NUMERIC,
  verified_amount_cents INTEGER,
  verified_category TEXT,
  verified_vendor TEXT,
  verified_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  audit_status TEXT NOT NULL DEFAULT 'pending' CHECK (audit_status IN ('pending','verified','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_run ON expense_receipts(route_run_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_employee ON expense_receipts(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_status ON expense_receipts(audit_status);

-- ============================================================
-- 7. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS route_runs_updated_at ON route_runs;
CREATE TRIGGER route_runs_updated_at
  BEFORE UPDATE ON route_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS route_stops_updated_at ON route_stops;
CREATE TRIGGER route_stops_updated_at
  BEFORE UPDATE ON route_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS expense_receipts_updated_at ON expense_receipts;
CREATE TRIGGER expense_receipts_updated_at
  BEFORE UPDATE ON expense_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. RLS — server-side only; Next.js API layer enforces permissions.
-- ============================================================
ALTER TABLE route_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profitability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_all_route_runs" ON route_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_route_stops" ON route_stops
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_cost_ledger" ON cost_ledger_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_job_allocations" ON job_cost_allocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_profitability" ON profitability_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_expense_receipts" ON expense_receipts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 9. Allocation invariant helper
-- ============================================================
CREATE OR REPLACE FUNCTION check_allocations_sum_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
  ledger_amount INTEGER;
  allocated_amount INTEGER;
BEGIN
  SELECT COALESCE(SUM(allocated_amount_cents), 0)
    INTO allocated_amount
    FROM job_cost_allocations
    WHERE cost_ledger_entry_id = NEW.cost_ledger_entry_id;

  SELECT amount_cents INTO ledger_amount
    FROM cost_ledger_entries
    WHERE id = NEW.cost_ledger_entry_id;

  -- Allow one cent of rounding drift per allocation row.
  IF ABS(allocated_amount - ledger_amount) > (
    SELECT COALESCE(COUNT(*)::integer, 0)
    FROM job_cost_allocations
    WHERE cost_ledger_entry_id = NEW.cost_ledger_entry_id
  ) THEN
    RAISE EXCEPTION 'Allocations for cost_ledger_entry % sum to % cents but ledger amount is % cents',
      NEW.cost_ledger_entry_id, allocated_amount, ledger_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_cost_allocations_sum_check ON job_cost_allocations;
CREATE TRIGGER job_cost_allocations_sum_check
  AFTER INSERT OR UPDATE ON job_cost_allocations
  FOR EACH ROW EXECUTE FUNCTION check_allocations_sum_to_ledger();
