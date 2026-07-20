-- ============================================================
-- Junkhaul Calgary — Disposal intelligence and dump reconciliation
-- Date: 2026-08-02
--
-- Adds:
--   facilities              — generic disposal/diversion locations
--   disposal_runs           — predicted and actual disposal per route
--   disposal_tickets        — scale tickets, photos, OCR and verification
--   disposal_alerts         — anomalous cost / facility / weight flags
-- ============================================================

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  type TEXT NOT NULL DEFAULT 'landfill' CHECK (type IN ('landfill','recycler','donation_center','storage','transfer_station')),
  accepted_streams TEXT[] NOT NULL DEFAULT '{}',
  operating_hours JSONB NOT NULL DEFAULT '{"open":7,"close":19}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facilities_active_type ON facilities(is_active, type);
CREATE INDEX IF NOT EXISTS idx_facilities_streams ON facilities USING gin(accepted_streams);

CREATE TABLE IF NOT EXISTS disposal_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES crew_assignments(id) ON DELETE SET NULL,
  route_plan_id UUID REFERENCES route_plans(id) ON DELETE SET NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  waste_stream TEXT NOT NULL DEFAULT 'general',
  booking_ids UUID[] NOT NULL DEFAULT '{}',
  predicted_kg NUMERIC NOT NULL DEFAULT 0,
  actual_kg NUMERIC,
  predicted_cost_cents INTEGER NOT NULL DEFAULT 0,
  actual_cost_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'predicted' CHECK (status IN ('predicted','actual_pending','verified','flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disposal_runs_assignment ON disposal_runs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_disposal_runs_route_plan ON disposal_runs(route_plan_id);
CREATE INDEX IF NOT EXISTS idx_disposal_runs_status ON disposal_runs(status);

CREATE TABLE IF NOT EXISTS disposal_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disposal_run_id UUID NOT NULL REFERENCES disposal_runs(id) ON DELETE CASCADE,
  inbound_weight_kg NUMERIC,
  outbound_weight_kg NUMERIC,
  net_weight_kg NUMERIC,
  waste_class TEXT,
  facility_fee_cents INTEGER NOT NULL DEFAULT 0,
  surcharge_cents INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER,
  photo_url TEXT,
  receipt_url TEXT,
  ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending','success','conflict','verified')),
  ocr_raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  verification_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disposal_tickets_run ON disposal_tickets(disposal_run_id);
CREATE INDEX IF NOT EXISTS idx_disposal_tickets_ocr ON disposal_tickets(ocr_status);

CREATE TABLE IF NOT EXISTS disposal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disposal_run_id UUID NOT NULL REFERENCES disposal_runs(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('wrong_facility','surcharge','weight_limit','cost_variance','anomalous_cost')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disposal_alerts_run ON disposal_alerts(disposal_run_id);
CREATE INDEX IF NOT EXISTS idx_disposal_alerts_unack ON disposal_alerts(acknowledged, severity);

-- RLS: service role only; crew/admin access through Next.js API layer.
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facilities' AND policyname = 'service_role_all_facilities') THEN
    CREATE POLICY service_role_all_facilities ON facilities FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disposal_runs' AND policyname = 'service_role_all_disposal_runs') THEN
    CREATE POLICY service_role_all_disposal_runs ON disposal_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disposal_tickets' AND policyname = 'service_role_all_disposal_tickets') THEN
    CREATE POLICY service_role_all_disposal_tickets ON disposal_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disposal_alerts' AND policyname = 'service_role_all_disposal_alerts') THEN
    CREATE POLICY service_role_all_disposal_alerts ON disposal_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Updated_at trigger helper (re-uses existing set_updated_at if available, otherwise create).
CREATE OR REPLACE FUNCTION disposal_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_facilities_updated_at') THEN
    CREATE TRIGGER trg_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION disposal_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_disposal_runs_updated_at') THEN
    CREATE TRIGGER trg_disposal_runs_updated_at BEFORE UPDATE ON disposal_runs
    FOR EACH ROW EXECUTE FUNCTION disposal_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_disposal_tickets_updated_at') THEN
    CREATE TRIGGER trg_disposal_tickets_updated_at BEFORE UPDATE ON disposal_tickets
    FOR EACH ROW EXECUTE FUNCTION disposal_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_disposal_alerts_updated_at') THEN
    CREATE TRIGGER trg_disposal_alerts_updated_at BEFORE UPDATE ON disposal_alerts
    FOR EACH ROW EXECUTE FUNCTION disposal_set_updated_at();
  END IF;
END $$;

-- Seed Calgary-area facilities.
INSERT INTO facilities (name, address, lat, lng, type, accepted_streams, operating_hours)
VALUES
  ('East Calgary Landfill', '3801 68 St SE, Calgary, AB', 51.0379, -113.9829, 'landfill', ARRAY['general','mixed','construction'], '{"open":7,"close":19}'),
  ('Spyhill Landfill', '11808 69 St NW, Calgary, AB', 51.1465, -114.0878, 'landfill', ARRAY['general','mixed'], '{"open":7,"close":19}'),
  ('Shepard Landfill', '12111 68 St SE, Calgary, AB', 51.0125, -113.9847, 'landfill', ARRAY['general','mixed','construction'], '{"open":7,"close":19}'),
  ('Calgary Metal Recycling', '1234 52 St SE, Calgary, AB', 51.0500, -113.9700, 'recycler', ARRAY['metal','electronics','appliance'], '{"open":8,"close":17}'),
  ('Goodwill Donation Centre', '5678 16 Ave NE, Calgary, AB', 51.0600, -114.0000, 'donation_center', ARRAY['donation','furniture','electronics'], '{"open":9,"close":18}')
ON CONFLICT DO NOTHING;
