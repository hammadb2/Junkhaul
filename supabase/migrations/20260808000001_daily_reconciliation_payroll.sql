-- ============================================================
-- Junkhaul Calgary — Daily reconciliation, payroll, and actual profitability
-- Date: 2026-08-08
--
-- Closes each route financially, compares quoted assumptions with actuals,
-- creates adjusting entries, and feeds approved hours into payroll without
-- silently rewriting payroll history.
-- ============================================================

-- 1. Daily reconciliation header
CREATE TABLE IF NOT EXISTS daily_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id UUID NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  route_run_id UUID REFERENCES route_runs(id) ON DELETE SET NULL,
  reconciliation_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','signed_off')),
  estimated_revenue_cents INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  estimated_contribution_cents INTEGER NOT NULL DEFAULT 0,
  actual_revenue_cents INTEGER NOT NULL DEFAULT 0,
  actual_cost_cents INTEGER NOT NULL DEFAULT 0,
  actual_contribution_cents INTEGER NOT NULL DEFAULT 0,
  variance_cents INTEGER NOT NULL DEFAULT 0,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_reconciliations_route ON daily_reconciliations(route_plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_reconciliations_date ON daily_reconciliations(reconciliation_date, status);

-- 2. Per-category variance lines
CREATE TABLE IF NOT EXISTS reconciliation_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_reconciliation_id UUID NOT NULL REFERENCES daily_reconciliations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  estimated_cents INTEGER NOT NULL DEFAULT 0,
  actual_cents INTEGER NOT NULL DEFAULT 0,
  variance_cents INTEGER NOT NULL DEFAULT 0,
  threshold_cents INTEGER NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_variances_rec ON reconciliation_variances(daily_reconciliation_id, category);
CREATE INDEX IF NOT EXISTS idx_reconciliation_variances_flagged ON reconciliation_variances(flagged, created_at DESC);

-- 3. Manager-approved adjusting entries (never overwrite originals)
CREATE TABLE IF NOT EXISTS adjusting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_reconciliation_id UUID NOT NULL REFERENCES daily_reconciliations(id) ON DELETE CASCADE,
  original_ledger_entry_id UUID REFERENCES cost_ledger_entries(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  old_amount_cents INTEGER NOT NULL,
  new_amount_cents INTEGER NOT NULL,
  difference_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjusting_entries_rec ON adjusting_entries(daily_reconciliation_id);

-- 4. Payroll feed lock — links approved hours to a pay run and prevents
--    later route reconciliation from silently changing them.
CREATE TABLE IF NOT EXISTS route_reconciliation_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_reconciliation_id UUID NOT NULL REFERENCES daily_reconciliations(id) ON DELETE CASCADE,
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  pay_run_id UUID REFERENCES pay_runs(id) ON DELETE SET NULL,
  approved_regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  approved_overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (daily_reconciliation_id, timesheet_id)
);

CREATE INDEX IF NOT EXISTS idx_route_reconciliation_payroll_rec ON route_reconciliation_payroll(daily_reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_route_reconciliation_payroll_ts ON route_reconciliation_payroll(timesheet_id);

-- 5. updated_at trigger for daily_reconciliations
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_reconciliations_updated_at ON daily_reconciliations;
CREATE TRIGGER daily_reconciliations_updated_at
  BEFORE UPDATE ON daily_reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE daily_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjusting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_reconciliation_payroll ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_reconciliations' AND policyname = 'service_role_all_daily_reconciliations') THEN
    CREATE POLICY service_role_all_daily_reconciliations ON daily_reconciliations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reconciliation_variances' AND policyname = 'service_role_all_reconciliation_variances') THEN
    CREATE POLICY service_role_all_reconciliation_variances ON reconciliation_variances FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'adjusting_entries' AND policyname = 'service_role_all_adjusting_entries') THEN
    CREATE POLICY service_role_all_adjusting_entries ON adjusting_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'route_reconciliation_payroll' AND policyname = 'service_role_all_route_reconciliation_payroll') THEN
    CREATE POLICY service_role_all_route_reconciliation_payroll ON route_reconciliation_payroll FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
