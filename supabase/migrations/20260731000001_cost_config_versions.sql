-- ============================================================
-- Junk Haul Calgary — Versioned Operating Cost Configuration
-- Date: 2026-07-31
--
-- Moves financial assumptions (truck rental, fuel, labor, landfill,
-- overhead, pricing policy) out of JavaScript constants and into
-- auditable, versioned tables. Every versioned row is immutable once
-- created; changes are applied as new versions that supersede the old.
-- ============================================================

-- ============================================================
-- 1. VEHICLE PROFILES
--    Configurable truck / trailer profiles with capacity and
--    clean/dirty eligibility flags. Rehaul clean vehicles never visit
--    landfills; dirty vehicles (U-Haul rental) can.
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_class text NOT NULL UNIQUE,
  volume_cuft numeric NOT NULL,
  volume_yd3 numeric NOT NULL,
  legal_payload_kg numeric NOT NULL,
  operational_weight_limit_kg numeric NOT NULL,
  fuel_baseline_l_per_100km numeric NOT NULL,
  clean_eligible boolean NOT NULL DEFAULT false,
  dirty_eligible boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  source text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_profiles_active_class_idx ON vehicle_profiles(active, vehicle_class);

-- ============================================================
-- 2. RENTAL RATE VERSIONS
--    Provider/location/vehicle rental rates by effective period.
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  location text NOT NULL,
  vehicle_profile_id uuid NOT NULL REFERENCES vehicle_profiles(id) ON DELETE RESTRICT,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  daily_rate numeric NOT NULL,
  included_km numeric NOT NULL DEFAULT 0,
  per_mile_rate numeric NOT NULL,
  per_km_rate numeric NOT NULL,
  taxes_percent numeric NOT NULL DEFAULT 0,
  source_document text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT rental_rate_versions_no_self_overlap EXCLUDE USING gist (
    provider WITH =,
    location WITH =,
    vehicle_profile_id WITH =,
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS rental_rate_versions_effective_idx ON rental_rate_versions(vehicle_profile_id, provider, location, effective_from DESC);

-- ============================================================
-- 3. FUEL RATE VERSIONS
--    Fuel price per litre and the safe fuel-consumption assumption
--    used for quoting (e.g. 45 L/100 km business observation).
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  price_per_litre numeric NOT NULL,
  source text,
  quote_safety_l_per_100km numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT fuel_rate_versions_no_overlap EXCLUDE USING gist (
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS fuel_rate_versions_effective_idx ON fuel_rate_versions(effective_from DESC);

-- ============================================================
-- 4. LABOR RATE VERSIONS
--    Role/employee specific hourly rate, burden and overtime rules.
-- ============================================================
CREATE TABLE IF NOT EXISTS labor_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_or_employee text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  hourly_rate numeric NOT NULL,
  burden_percent numeric NOT NULL DEFAULT 0,
  overtime_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT labor_rate_versions_no_overlap EXCLUDE USING gist (
    role_or_employee WITH =,
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS labor_rate_versions_effective_idx ON labor_rate_versions(role_or_employee, effective_from DESC);

-- ============================================================
-- 5. FACILITY RATE VERSIONS
--    Disposal/recycling facility rates by waste stream.
-- ============================================================
CREATE TABLE IF NOT EXISTS facility_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility text NOT NULL,
  waste_stream text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  flat_minimum numeric NOT NULL DEFAULT 0,
  per_tonne_rate numeric NOT NULL DEFAULT 0,
  surcharges jsonb NOT NULL DEFAULT '{}'::jsonb,
  item_fees jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax_treatment text NOT NULL DEFAULT 'included',
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT facility_rate_versions_no_overlap EXCLUDE USING gist (
    facility WITH =,
    waste_stream WITH =,
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS facility_rate_versions_effective_idx ON facility_rate_versions(facility, waste_stream, effective_from DESC);

-- ============================================================
-- 6. OVERHEAD RATE VERSIONS
--    Payment fees, supplies, insurance, software, admin, and
--    contingency / risk reserve allocations.
-- ============================================================
CREATE TABLE IF NOT EXISTS overhead_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  payment_fees_percent numeric NOT NULL DEFAULT 0,
  supplies_per_job numeric NOT NULL DEFAULT 0,
  insurance_allocation_per_day numeric NOT NULL DEFAULT 0,
  software_per_month numeric NOT NULL DEFAULT 0,
  admin_per_month numeric NOT NULL DEFAULT 0,
  contingency_percent numeric NOT NULL DEFAULT 0,
  risk_reserve_percent numeric NOT NULL DEFAULT 0,
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT overhead_rate_versions_no_overlap EXCLUDE USING gist (
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS overhead_rate_versions_effective_idx ON overhead_rate_versions(effective_from DESC);

-- ============================================================
-- 7. PRICING POLICY VERSIONS
--    Target margin, minimum contribution, rounding, ceiling,
--    review thresholds.
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  target_margin_percent numeric NOT NULL,
  minimum_contribution_percent numeric NOT NULL DEFAULT 0,
  rounding_rule text NOT NULL DEFAULT 'nearest_dollar',
  auto_quote_ceiling numeric,
  review_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','draft')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT pricing_policy_versions_no_overlap EXCLUDE USING gist (
    tsrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS pricing_policy_versions_effective_idx ON pricing_policy_versions(effective_from DESC);

-- ============================================================
-- 8. SUPERSEDE TRIGGER
--    When a new active version is inserted, close the previous
--    active version's effective_to and mark it superseded.
--    Uses the key columns of each table for scope.
-- ============================================================
CREATE OR REPLACE FUNCTION supersede_previous_rate_version()
RETURNS TRIGGER AS $$
DECLARE
  key_cols text[];
  where_clause text;
  sql_query text;
  old_id uuid;
  audit_entry jsonb;
BEGIN
  -- Build scope filter dynamically from the table's text/uuid columns.
  -- This is intentionally simple; each table has a unique natural key.
  IF TG_TABLE_NAME = 'rental_rate_versions' THEN
    SELECT id INTO old_id
    FROM rental_rate_versions
    WHERE provider = NEW.provider
      AND location = NEW.location
      AND vehicle_profile_id = NEW.vehicle_profile_id
      AND status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'fuel_rate_versions' THEN
    SELECT id INTO old_id
    FROM fuel_rate_versions
    WHERE status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'labor_rate_versions' THEN
    SELECT id INTO old_id
    FROM labor_rate_versions
    WHERE role_or_employee = NEW.role_or_employee
      AND status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'facility_rate_versions' THEN
    SELECT id INTO old_id
    FROM facility_rate_versions
    WHERE facility = NEW.facility
      AND waste_stream = NEW.waste_stream
      AND status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'overhead_rate_versions' THEN
    SELECT id INTO old_id
    FROM overhead_rate_versions
    WHERE status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'pricing_policy_versions' THEN
    SELECT id INTO old_id
    FROM pricing_policy_versions
    WHERE status = 'active'
      AND (effective_to IS NULL OR effective_to > NEW.effective_from)
      AND id <> NEW.id
    ORDER BY effective_from DESC
    LIMIT 1;
  END IF;

  IF old_id IS NOT NULL THEN
    -- Close the old row and append an audit entry.
    EXECUTE format('UPDATE %I SET effective_to = $1, status = ''superseded'', version = version + 1, audit_history = audit_history || $2 WHERE id = $3', TG_TABLE_NAME)
    USING NEW.effective_from,
      jsonb_build_array(jsonb_build_object(
        'event','superseded',
        'replaced_by',NEW.id,
        'replaced_at',now(),
        'effective_to',NEW.effective_from
      )),
      old_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rental_rate_versions_supersede ON rental_rate_versions;
CREATE TRIGGER rental_rate_versions_supersede
  BEFORE INSERT ON rental_rate_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

DROP TRIGGER IF EXISTS fuel_rate_versions_supersede ON fuel_rate_versions;
CREATE TRIGGER fuel_rate_versions_supersede
  BEFORE INSERT ON fuel_rate_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

DROP TRIGGER IF EXISTS labor_rate_versions_supersede ON labor_rate_versions;
CREATE TRIGGER labor_rate_versions_supersede
  BEFORE INSERT ON labor_rate_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

DROP TRIGGER IF EXISTS facility_rate_versions_supersede ON facility_rate_versions;
CREATE TRIGGER facility_rate_versions_supersede
  BEFORE INSERT ON facility_rate_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

DROP TRIGGER IF EXISTS overhead_rate_versions_supersede ON overhead_rate_versions;
CREATE TRIGGER overhead_rate_versions_supersede
  BEFORE INSERT ON overhead_rate_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

DROP TRIGGER IF EXISTS pricing_policy_versions_supersede ON pricing_policy_versions;
CREATE TRIGGER pricing_policy_versions_supersede
  BEFORE INSERT ON pricing_policy_versions
  FOR EACH ROW EXECUTE FUNCTION supersede_previous_rate_version();

-- ============================================================
-- 9. RLS — service role only; admin API mediates all access.
-- ============================================================
ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overhead_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON vehicle_profiles;
CREATE POLICY "Service role full access" ON vehicle_profiles FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON rental_rate_versions;
CREATE POLICY "Service role full access" ON rental_rate_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON fuel_rate_versions;
CREATE POLICY "Service role full access" ON fuel_rate_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON labor_rate_versions;
CREATE POLICY "Service role full access" ON labor_rate_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON facility_rate_versions;
CREATE POLICY "Service role full access" ON facility_rate_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON overhead_rate_versions;
CREATE POLICY "Service role full access" ON overhead_rate_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON pricing_policy_versions;
CREATE POLICY "Service role full access" ON pricing_policy_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 10. SEED — verified business benchmark
--    Source: U-Haul benchmark supplied by operations.
--    65.98 km, $2.40/mile, $40/day rental, $50 fuel at $1.75/L,
--    45 L/100 km safe fuel assumption, $80 disposal.
-- ============================================================

-- 15-foot U-Haul reference truck
INSERT INTO vehicle_profiles (
  name, vehicle_class, volume_cuft, volume_yd3, legal_payload_kg,
  operational_weight_limit_kg, fuel_baseline_l_per_100km, clean_eligible,
  dirty_eligible, active, source
)
VALUES (
  'U-Haul 15ft', '15ft_uhaul', 764, round(764::numeric / 27, 2), 2897, 2897,
  45, false, true, true,
  'U-Haul 15ft truck: 764 ft³ / 28.3 yd³, max payload approximately 2,897 kg. Business observation only; operational limit configurable and may be lower.'
)
ON CONFLICT (vehicle_class) DO NOTHING;

-- Rental rate at Gas Plus Balzac
INSERT INTO rental_rate_versions (
  provider, location, vehicle_profile_id, effective_from, daily_rate,
  included_km, per_mile_rate, per_km_rate, taxes_percent, source_document, status
)
VALUES (
  'U-Haul',
  'Gas Plus Balzac, 10070 Hwy 566, Balzac, AB T4B 2T3',
  (SELECT id FROM vehicle_profiles WHERE vehicle_class = '15ft_uhaul'),
  '2026-07-20T00:00:00Z',
  40.00,
  0,
  2.40,
  round((2.40 / 1.609344)::numeric, 6), -- $2.40/mile -> $/km, stored for transparency
  0,
  'U-Haul benchmark: 65.98 km, $2.40/mile mileage, $40/day rental.',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO fuel_rate_versions (
  effective_from, price_per_litre, source, quote_safety_l_per_100km, status
)
VALUES (
  '2026-07-20T00:00:00Z',
  1.75,
  'Business observation: fuel at $1.75/L and 45 L/100 km safe quoting assumption.',
  45,
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO labor_rate_versions (
  role_or_employee, effective_from, hourly_rate, burden_percent, overtime_rules, source, status
)
VALUES (
  'default_crew',
  '2026-07-20T00:00:00Z',
  18.00,
  0,
  '{"overtime_after_hours_per_day":8,"overtime_after_hours_per_week":44,"overtime_multiplier":1.5}',
  'Crew labor: two people at $18/hour each; clock runs from leaving home until both return home.',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO facility_rate_versions (
  facility, waste_stream, effective_from, flat_minimum, per_tonne_rate,
  surcharges, item_fees, tax_treatment, source, status
)
VALUES (
  'East Calgary Landfill',
  'general_junk',
  '2026-07-20T00:00:00Z',
  80.00,
  0,
  '{}',
  '{}',
  'included',
  'U-Haul benchmark disposal: $80.',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO overhead_rate_versions (
  effective_from, payment_fees_percent, supplies_per_job, insurance_allocation_per_day,
  software_per_month, admin_per_month, contingency_percent, risk_reserve_percent, source, status
)
VALUES (
  '2026-07-20T00:00:00Z',
  0, 0, 0, 0, 0, 0, 0,
  'Placeholder: allocate actual payment fees, supplies, insurance, software, admin, contingency and risk reserve as finance determines them.',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO pricing_policy_versions (
  effective_from, target_margin_percent, minimum_contribution_percent,
  rounding_rule, auto_quote_ceiling, review_thresholds, source, status
)
VALUES (
  '2026-07-20T00:00:00Z',
  20.0,
  0,
  'nearest_dollar',
  NULL,
  '{"margin_review_below_percent":15,"owner_review_above_dollar":1000}',
  'Target minimum gross margin 20%, calculated as price = cost / (1 - 0.20), not cost * 1.20.',
  'active'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. PERMISSIONS
--    cost_config.read  — admin/manager can view cost config
--    cost_config.manage — owner only (mutation of financial rates)
-- ============================================================
INSERT INTO permissions (key, description, owner_only) VALUES
  ('cost_config.read', 'Read versioned operating cost configuration', false),
  ('cost_config.manage', 'Create and supersede versioned operating cost configuration', true)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner_only = EXCLUDED.owner_only;

-- Owner receives every permission (idempotent).
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r CROSS JOIN permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

-- Admin can read cost config.
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r JOIN permissions p ON p.key IN ('cost_config.read')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager can read cost config.
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r JOIN permissions p ON p.key IN ('cost_config.read')
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;
