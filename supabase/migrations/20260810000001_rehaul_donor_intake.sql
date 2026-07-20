-- ============================================================
-- Junkhaul Calgary — Rehaul donor intake, inspection, quarantine and custody
-- Date: 2026-08-10
--
-- Workflow: submitted → evidence_review → provisionally_accepted →
-- route_scheduled → collected → quarantine → inspected →
-- cleaning_repair → sellable/recycle/reject → listed.
-- ============================================================

CREATE TABLE IF NOT EXISTS donation_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rehaul_customer_id UUID REFERENCES rehaul_customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','evidence_review','provisionally_accepted','route_scheduled',
    'collected','quarantine','inspected','cleaning_repair','sellable','recycle','reject','listed'
  )),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferred_pickup_date DATE,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  donor_notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donation_intakes_tenant_status ON donation_intakes(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_donation_intakes_customer ON donation_intakes(rehaul_customer_id);

CREATE TABLE IF NOT EXISTS donation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_intake_id UUID NOT NULL REFERENCES donation_intakes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  condition_notes TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendation TEXT,
  ai_confidence NUMERIC,
  ai_resale_estimate_cents INTEGER,
  physical_status TEXT DEFAULT 'pending' CHECK (physical_status IN ('pending','accepted','quarantined','rejected')),
  decision TEXT DEFAULT 'pending' CHECK (decision IN ('pending','accept','reject','quarantine')),
  decision_reason TEXT,
  inspected_at TIMESTAMPTZ,
  listed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donation_items_intake ON donation_items(donation_intake_id);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_item ON inspections(donation_item_id);

CREATE TABLE IF NOT EXISTS quarantine_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  reason TEXT NOT NULL,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quarantine_records_item ON quarantine_records(donation_item_id);

CREATE TABLE IF NOT EXISTS donation_custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_intake_id UUID NOT NULL REFERENCES donation_intakes(id) ON DELETE CASCADE,
  donation_item_id UUID REFERENCES donation_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('scan','load','unload','transfer','disposition','photo')),
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  location TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donation_custody_events_intake ON donation_custody_events(donation_intake_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donation_custody_events_item ON donation_custody_events(donation_item_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS donation_intakes_updated_at ON donation_intakes;
CREATE TRIGGER donation_intakes_updated_at
  BEFORE UPDATE ON donation_intakes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE donation_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_custody_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'donation_intakes' AND policyname = 'service_role_all_donation_intakes') THEN
    CREATE POLICY service_role_all_donation_intakes ON donation_intakes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'donation_items' AND policyname = 'service_role_all_donation_items') THEN
    CREATE POLICY service_role_all_donation_items ON donation_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspections' AND policyname = 'service_role_all_inspections') THEN
    CREATE POLICY service_role_all_inspections ON inspections FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quarantine_records' AND policyname = 'service_role_all_quarantine_records') THEN
    CREATE POLICY service_role_all_quarantine_records ON quarantine_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'donation_custody_events' AND policyname = 'service_role_all_donation_custody_events') THEN
    CREATE POLICY service_role_all_donation_custody_events ON donation_custody_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
