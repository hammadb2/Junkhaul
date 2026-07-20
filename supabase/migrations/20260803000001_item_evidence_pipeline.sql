-- ============================================================
-- Junkhaul Calgary — Guided photo capture and item evidence pipeline
-- Date: 2026-08-03
--
-- Tracks discrete item observations, candidate identities, evidence sources,
-- dimension/weight/volume estimates, hazard flags, and human review decisions.
-- Every inferred value is stored with a confidence tier (A/B/C/D) and a range;
-- exact values require authoritative model docs or physical measurement.
-- ============================================================

CREATE TABLE IF NOT EXISTS item_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  session_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  capture_stage TEXT[] NOT NULL DEFAULT '{}', -- full_item, context, label, damage, scale, access, contamination
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','analyzing','review_required','complete')),
  original_prompt_version TEXT,
  original_model_output JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_obs_booking ON item_observations(booking_id);
CREATE INDEX IF NOT EXISTS idx_item_obs_session ON item_observations(session_id);

CREATE TABLE IF NOT EXISTS item_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES item_observations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  normalized_name TEXT,
  category TEXT,
  material TEXT,
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact','equivalent','generic','unknown')),
  source_url TEXT,
  source_title TEXT,
  source_region TEXT,
  retrieval_date TIMESTAMPTZ,
  confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 5),
  rank INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_candidates_obs ON item_candidates(observation_id);
CREATE INDEX IF NOT EXISTS idx_item_candidates_rank ON item_candidates(observation_id, rank);

CREATE TABLE IF NOT EXISTS item_evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES item_candidates(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- gemini, groq, search, catalog, manual
  prompt_version TEXT,
  raw_response JSONB NOT NULL DEFAULT '{}',
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_evidence_candidate ON item_evidence_sources(candidate_id);

CREATE TABLE IF NOT EXISTS item_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES item_observations(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES item_candidates(id) ON DELETE SET NULL,
  weight_min_kg NUMERIC NOT NULL DEFAULT 0,
  weight_likely_kg NUMERIC NOT NULL DEFAULT 0,
  weight_max_kg NUMERIC NOT NULL DEFAULT 0,
  volume_min_cuft NUMERIC NOT NULL DEFAULT 0,
  volume_likely_cuft NUMERIC NOT NULL DEFAULT 0,
  volume_max_cuft NUMERIC NOT NULL DEFAULT 0,
  disassembly_required BOOLEAN NOT NULL DEFAULT false,
  evidence_tier TEXT NOT NULL DEFAULT 'D' CHECK (evidence_tier IN ('A','B','C','D')),
  numeric_confidence NUMERIC NOT NULL DEFAULT 0,
  conservative_weight_kg NUMERIC NOT NULL DEFAULT 0, -- upper bound used for pricing/routing
  conservative_volume_cuft NUMERIC NOT NULL DEFAULT 0,
  pricing_stream TEXT, -- waste stream from disposal classification
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_estimates_obs ON item_estimates(observation_id);
CREATE INDEX IF NOT EXISTS idx_item_estimates_candidate ON item_estimates(candidate_id);

CREATE TABLE IF NOT EXISTS item_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES item_estimates(id) ON DELETE CASCADE,
  length_cm NUMERIC,
  width_cm NUMERIC,
  height_cm NUMERIC,
  method TEXT NOT NULL DEFAULT 'inferred' CHECK (method IN ('inferred','scale_reference','laser','tape','manual')),
  photo_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_item_dimensions_estimate ON item_dimensions(estimate_id);

CREATE TABLE IF NOT EXISTS item_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES item_observations(id) ON DELETE CASCADE,
  hazard_type TEXT NOT NULL CHECK (hazard_type IN ('hazmat','contamination','pest','high_impact','ambiguous','unknown_liquid')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  description TEXT,
  requires_manual_review BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_hazards_obs ON item_hazards(observation_id);

CREATE TABLE IF NOT EXISTS item_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES item_observations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accept','correct','split','merge','reject','request_photo')),
  corrections JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_review_obs ON item_review_decisions(observation_id);

CREATE TABLE IF NOT EXISTS physical_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES item_observations(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  device_id TEXT,
  calibration_date DATE,
  operator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('scale','laser','tape','calculated')),
  weight_kg NUMERIC,
  length_cm NUMERIC,
  width_cm NUMERIC,
  height_cm NUMERIC,
  units TEXT NOT NULL DEFAULT 'metric',
  tolerance_percent NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physical_measurements_obs ON physical_measurements(observation_id);
CREATE INDEX IF NOT EXISTS idx_physical_measurements_booking ON physical_measurements(booking_id);

-- Add evidence fields to bookings for quick quote gates.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS item_evidence_status TEXT DEFAULT 'pending' CHECK (item_evidence_status IN ('pending','insufficient','review_required','complete')),
  ADD COLUMN IF NOT EXISTS item_evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

-- RLS: service role writes; customer/employee access through API layer.
ALTER TABLE item_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_measurements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_observations' AND policyname = 'service_role_all_item_observations') THEN
    CREATE POLICY service_role_all_item_observations ON item_observations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_candidates' AND policyname = 'service_role_all_item_candidates') THEN
    CREATE POLICY service_role_all_item_candidates ON item_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_evidence_sources' AND policyname = 'service_role_all_item_evidence_sources') THEN
    CREATE POLICY service_role_all_item_evidence_sources ON item_evidence_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_estimates' AND policyname = 'service_role_all_item_estimates') THEN
    CREATE POLICY service_role_all_item_estimates ON item_estimates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_dimensions' AND policyname = 'service_role_all_item_dimensions') THEN
    CREATE POLICY service_role_all_item_dimensions ON item_dimensions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_hazards' AND policyname = 'service_role_all_item_hazards') THEN
    CREATE POLICY service_role_all_item_hazards ON item_hazards FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_review_decisions' AND policyname = 'service_role_all_item_review_decisions') THEN
    CREATE POLICY service_role_all_item_review_decisions ON item_review_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'physical_measurements' AND policyname = 'service_role_all_physical_measurements') THEN
    CREATE POLICY service_role_all_physical_measurements ON physical_measurements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION item_evidence_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_item_observations_updated_at') THEN
    CREATE TRIGGER trg_item_observations_updated_at BEFORE UPDATE ON item_observations
    FOR EACH ROW EXECUTE FUNCTION item_evidence_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_item_estimates_updated_at') THEN
    CREATE TRIGGER trg_item_estimates_updated_at BEFORE UPDATE ON item_estimates
    FOR EACH ROW EXECUTE FUNCTION item_evidence_set_updated_at();
  END IF;
END $$;
