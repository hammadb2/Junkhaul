-- ============================================================
-- 20260728000001_donation_intelligence_dispatch.sql
--
-- Donation Intelligence and Route-Fit Backend.
-- Forward-only migration: do not edit already-applied historical
-- migrations. Extends the donation tables/permissions shipped in
-- 20260726000001_customer_admin_foundation.sql and
-- 20260727000002/3_operational_*.sql.
-- ============================================================

-- ---------- donation_ai_analyses: real vision-pipeline provenance ----------
ALTER TABLE donation_ai_analyses
  ADD COLUMN IF NOT EXISTS input_photo_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES donation_ai_analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_recommendation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS final_decision jsonb,
  ADD COLUMN IF NOT EXISTS final_decision_source text CHECK (final_decision_source IS NULL OR final_decision_source IN ('ai','human')),
  ADD COLUMN IF NOT EXISTS final_decision_actor uuid REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS fallback_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS cost_usd numeric,
  ADD COLUMN IF NOT EXISTS token_usage jsonb;

CREATE INDEX IF NOT EXISTS donation_ai_analyses_request_version_idx
  ON donation_ai_analyses(donation_request_id, analysis_version DESC);

-- ---------- donation_request_items: structured per-item vision output ----------
ALTER TABLE donation_request_items
  ADD COLUMN IF NOT EXISTS ai_analysis_id uuid REFERENCES donation_ai_analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS weight_kg_min numeric,
  ADD COLUMN IF NOT EXISTS weight_kg_max numeric,
  ADD COLUMN IF NOT EXISTS damage_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_parts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pest_contamination_indicators text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hazmat_indicators text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS suitability text CHECK (suitability IS NULL OR suitability IN ('suitable','not_suitable','needs_more_evidence','needs_manual_review')),
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS additional_photo_requirements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_destination_type text,
  ADD COLUMN IF NOT EXISTS manual_correction jsonb,
  ADD COLUMN IF NOT EXISTS corrected_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrected_at timestamptz;

-- ---------- donation_photo_sufficiency: sufficiency verdicts + evidence gaps ----------
CREATE TABLE IF NOT EXISTS donation_photo_sufficiency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  donation_ai_analysis_id uuid REFERENCES donation_ai_analyses(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('sufficient','more_photos_required','manual_review_required','automatic_rejection')),
  missing_evidence text[] NOT NULL DEFAULT '{}',
  requested_photo_types text[] NOT NULL DEFAULT '{}',
  quo_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  expected_reply_id uuid REFERENCES expected_replies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donation_photo_sufficiency_request_idx ON donation_photo_sufficiency(donation_request_id, created_at DESC);

-- ---------- donation_capacity_estimates: versioned capacity model ----------
CREATE TABLE IF NOT EXISTS donation_capacity_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','manual','policy_default')),
  ai_version text,
  volume_cuft numeric,
  weight_kg_min numeric,
  weight_kg_max numeric,
  floor_space_sqft numeric,
  stackable boolean,
  fragile boolean,
  required_orientation text,
  crew_count integer,
  required_equipment text[] NOT NULL DEFAULT '{}',
  pickup_duration_minutes integer,
  loading_duration_minutes integer,
  unloading_duration_minutes integer,
  confidence numeric,
  is_conservative boolean NOT NULL DEFAULT false,
  manual_correction jsonb,
  corrected_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  corrected_at timestamptz,
  is_final boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(donation_request_id, version)
);
CREATE INDEX IF NOT EXISTS donation_capacity_estimates_request_idx ON donation_capacity_estimates(donation_request_id, version DESC);

-- ---------- donation_centers: general destination table ----------
ALTER TABLE donation_centers
  ADD COLUMN IF NOT EXISTS destination_type text NOT NULL DEFAULT 'donation_centre'
    CHECK (destination_type IN ('donation_centre','restore','charity','rehaul_inventory','recycling')),
  ADD COLUMN IF NOT EXISTS accepted_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rejected_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS operating_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resale_potential text CHECK (resale_potential IS NULL OR resale_potential IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS disposal_restrictions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_load_pct numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------- donation_destination_scores: scoring across all destination types ----------
CREATE TABLE IF NOT EXISTS donation_destination_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  donation_request_item_id uuid REFERENCES donation_request_items(id) ON DELETE CASCADE,
  destination_type text NOT NULL CHECK (destination_type IN ('donation_centre','restore','charity','storage','rehaul_inventory','recycling','landfill')),
  destination_id uuid,
  destination_name text,
  considered boolean NOT NULL DEFAULT true,
  score numeric,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donation_destination_scores_request_idx ON donation_destination_scores(donation_request_id, created_at DESC);

ALTER TABLE donation_requests
  ADD COLUMN IF NOT EXISTS selected_destination_score_id uuid REFERENCES donation_destination_scores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_override_reason text,
  ADD COLUMN IF NOT EXISTS destination_override_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_dropoff_evidence_required boolean NOT NULL DEFAULT true;

-- ---------- donation_route_matches: route-fit evaluation result ----------
ALTER TABLE donation_route_matches
  ADD COLUMN IF NOT EXISTS route_version integer,
  ADD COLUMN IF NOT EXISTS decision text CHECK (decision IS NULL OR decision IN (
    'fits_current_route','fits_with_modification','fits_another_route','hold_for_future_route','convert_to_paid','reject'
  )),
  ADD COLUMN IF NOT EXISTS best_insertion_index integer,
  ADD COLUMN IF NOT EXISTS added_km numeric,
  ADD COLUMN IF NOT EXISTS added_labour_minutes numeric,
  ADD COLUMN IF NOT EXISTS paid_job_delay_risk text CHECK (paid_job_delay_risk IS NULL OR paid_job_delay_risk IN ('none','low','medium','high')),
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternatives_evaluated jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destination_score_id uuid REFERENCES donation_destination_scores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_version text;

-- ---------- donation_route_proposals: versioned, human-approved route changes ----------
CREATE TABLE IF NOT EXISTS donation_route_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  donation_route_match_id uuid REFERENCES donation_route_matches(id) ON DELETE SET NULL,
  crew_assignment_id uuid REFERENCES crew_assignments(id) ON DELETE SET NULL,
  source_route_plan_id uuid REFERENCES route_plans(id) ON DELETE SET NULL,
  source_route_version integer NOT NULL,
  proposed_stop jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_insertion_index integer,
  capacity_calculations jsonb NOT NULL DEFAULT '{}'::jsonb,
  timing_calculations jsonb NOT NULL DEFAULT '{}'::jsonb,
  destination_id uuid,
  reasons text[] NOT NULL DEFAULT '{}',
  model_version text,
  before_route jsonb,
  proposed_route jsonb,
  approved_route jsonb,
  resulting_route_plan_id uuid REFERENCES route_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','held','expired','stale')),
  approver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours')
);
CREATE INDEX IF NOT EXISTS donation_route_proposals_request_idx ON donation_route_proposals(donation_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS donation_route_proposals_status_idx ON donation_route_proposals(status, expires_at);

-- ---------- Route-fit / capacity system_config defaults ----------
INSERT INTO system_config (key, value, value_type, description, category) VALUES
  ('donation_pickup_duration_minutes', '20', 'number', 'Default on-site pickup duration for a free donation stop', 'donation'),
  ('donation_loading_duration_minutes', '15', 'number', 'Default loading duration for a free donation stop', 'donation'),
  ('donation_unloading_duration_minutes', '15', 'number', 'Default unloading duration at destination for a free donation stop', 'donation'),
  ('donation_route_fit_safety_buffer_minutes', '15', 'number', 'Minimum buffer minutes required before/after a paid job window when inserting a donation stop', 'donation'),
  ('donation_paid_job_delay_tolerance_minutes', '10', 'number', 'Maximum minutes a paid job arrival may shift due to an inserted donation stop', 'donation'),
  ('donation_route_proposal_expiry_minutes', '240', 'number', 'Minutes before an unapproved donation route proposal expires', 'donation'),
  ('crew_shift_max_minutes', '600', 'number', 'Maximum crew shift length in minutes used by the route-fit engine', 'donation')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- ---------- Permissions: grant donations.route_match (seeded earlier, ungranted) to manager ----------
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.key = 'donations.route_match'
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- ---------- RLS ----------
ALTER TABLE donation_photo_sufficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_capacity_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_destination_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_route_proposals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'donation_photo_sufficiency','donation_capacity_estimates','donation_destination_scores','donation_route_proposals'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', t);
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', t);
  END LOOP;
END $$;
