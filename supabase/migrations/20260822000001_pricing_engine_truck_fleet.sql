-- ============================================================
-- Pricing Engine Phase 1 — complete the U-Haul truck fleet, add
-- payload safety buffer, mandatory protection charge, and updated
-- labor rate.
--
-- Only vehicle_profiles.15ft_uhaul existed before this migration.
-- Adds the 20ft and 26ft profiles the business actually uses (all
-- three have loading ramps — no pickup trucks or cargo vans), plus
-- the columns needed to plan a truck off SAFE payload rather than
-- its full legal rating.
--
-- Real U-Haul spec sources (cross-checked against uhaul.com and
-- multiple independent moving-industry guides, 2026):
--   15ft: 764 cuft, legal payload ~2,897 kg (~6,385 lb), ~45 L/100km
--         (already the business's own observed figure)
--   20ft: 1,016 cuft, legal payload ~2,585 kg (5,700 lb), 40 gal tank,
--         ~10 mpg -> ~23.5 L/100km highway; quoting a conservative
--         city-driving figure below
--   26ft: 1,682 cuft, legal payload ~5,834 kg (12,859 lb), 60 gal tank,
--         ~10 mpg -> ~23.5 L/100km highway; same conservative bump
--
-- Rental rates for 20ft/26ft are NOT independently confirmed against
-- this business's actual U-Haul account (only the 15ft rate was
-- business-observed). Estimated here by applying U-Haul's public
-- local-rate ratio (15ft $29.95 / 20ft $39.95 / 26ft $49.95 day) to
-- the business's real $40/day 15ft rate. Clearly flagged in each
-- row's source_document as an estimate — correct via the admin Cost
-- Config panel once the business has real 20ft/26ft U-Haul invoices.
-- ============================================================

-- ------------------------------------------------------------
-- New columns
-- ------------------------------------------------------------
ALTER TABLE vehicle_profiles
  ADD COLUMN IF NOT EXISTS interior_length_ft numeric,
  ADD COLUMN IF NOT EXISTS interior_width_ft numeric,
  ADD COLUMN IF NOT EXISTS interior_height_ft numeric,
  ADD COLUMN IF NOT EXISTS fuel_tank_capacity_l numeric,
  ADD COLUMN IF NOT EXISTS ramp_details text,
  ADD COLUMN IF NOT EXISTS planned_payload_percent numeric NOT NULL DEFAULT 0.85;

COMMENT ON COLUMN vehicle_profiles.planned_payload_percent IS
  'Safety buffer applied on top of operational_weight_limit_kg when the engine plans a job — the truck is never planned at 100% of rated payload. Safe planning payload = operational_weight_limit_kg * planned_payload_percent.';

ALTER TABLE rental_rate_versions
  ADD COLUMN IF NOT EXISTS protection_fee numeric NOT NULL DEFAULT 18.00;

COMMENT ON COLUMN rental_rate_versions.protection_fee IS
  'Mandatory U-Haul protection charge (SafeMove-equivalent) included on every rental as an internal cost. Editable only via admin Cost Config — never removable by dispatch or the pricing engine.';

ALTER TABLE labor_rate_versions
  ADD COLUMN IF NOT EXISTS time_block_minutes numeric NOT NULL DEFAULT 30;

COMMENT ON COLUMN labor_rate_versions.time_block_minutes IS
  'Granularity the pricing engine rounds estimated labor time up to (e.g. 30 = nearest half hour).';

-- ------------------------------------------------------------
-- Backfill real dimensions/tank/ramp onto the existing 15ft profile
-- (predates these columns).
-- ------------------------------------------------------------
UPDATE vehicle_profiles
SET
  interior_length_ft = 15.9,
  interior_width_ft = 7.67,
  interior_height_ft = 7.17,
  fuel_tank_capacity_l = 117, -- ~31 US gal
  ramp_details = 'Standard U-Haul loading ramp, low-deck design.'
WHERE vehicle_class = '15ft_uhaul' AND interior_length_ft IS NULL;

-- ------------------------------------------------------------
-- New vehicle profiles: 20ft and 26ft (both ramp-equipped, matching
-- the business rule of only using ramp trucks).
-- ------------------------------------------------------------
INSERT INTO vehicle_profiles (
  name, vehicle_class, volume_cuft, volume_yd3, legal_payload_kg,
  operational_weight_limit_kg, fuel_baseline_l_per_100km,
  interior_length_ft, interior_width_ft, interior_height_ft,
  fuel_tank_capacity_l, ramp_details, planned_payload_percent,
  clean_eligible, dirty_eligible, active, source
) VALUES (
  'U-Haul 20ft', '20ft_uhaul', 1016, round(1016::numeric / 27, 2), 2585, 2585,
  52, -- conservative city-driving L/100km (U-Haul cites ~10mpg highway; quoting heavier for safety)
  19.5, 7.67, 7.17,
  151, -- 40 US gal
  'EZ-Load ramp, low-deck design.',
  0.85, false, true, true,
  'U-Haul 20ft truck: 1,016 ft³, max payload approximately 2,585 kg (5,700 lb), 40-gallon tank. Public U-Haul specifications (uhaul.com), cross-checked against independent moving-industry guides, 2026. Fuel L/100km is a conservative city-driving estimate from the cited ~10 mpg highway figure.'
)
ON CONFLICT (vehicle_class) DO NOTHING;

INSERT INTO vehicle_profiles (
  name, vehicle_class, volume_cuft, volume_yd3, legal_payload_kg,
  operational_weight_limit_kg, fuel_baseline_l_per_100km,
  interior_length_ft, interior_width_ft, interior_height_ft,
  fuel_tank_capacity_l, ramp_details, planned_payload_percent,
  clean_eligible, dirty_eligible, active, source
) VALUES (
  'U-Haul 26ft', '26ft_uhaul', 1682, round(1682::numeric / 27, 2), 5834, 5834,
  52, -- same conservative city-driving assumption as 20ft; correct once real data exists
  26.17, 8.17, 8.25,
  227, -- 60 US gal
  'EZ-Load ramp, low-deck design.',
  0.85, false, true, true,
  'U-Haul 26ft truck: 1,682 ft³, max payload approximately 5,834 kg (12,859 lb), 60-gallon tank. Public U-Haul specifications (uhaul.com), cross-checked against independent moving-industry guides, 2026. Fuel L/100km is a conservative city-driving estimate from the cited ~10 mpg highway figure.'
)
ON CONFLICT (vehicle_class) DO NOTHING;

-- ------------------------------------------------------------
-- Rental rates for the two new profiles (estimated — see header).
-- ------------------------------------------------------------
INSERT INTO rental_rate_versions (
  provider, location, vehicle_profile_id, effective_from, daily_rate,
  included_km, per_mile_rate, per_km_rate, taxes_percent, protection_fee,
  source_document, status
)
SELECT
  'U-Haul',
  'Gas Plus Balzac, 10070 Hwy 566, Balzac, AB T4B 2T3',
  vp.id,
  '2026-07-22T00:00:00Z',
  53.00,
  0,
  2.40,
  round((2.40 / 1.609344)::numeric, 6),
  0,
  18.00,
  'ESTIMATED: scaled from the business''s confirmed 15ft rate ($40/day) using U-Haul''s public local daily-rate ratio (15ft $29.95 / 20ft $39.95 -> 1.334x). Per-mile rate carried over from the 15ft rate pending real 20ft invoice data. Correct via admin Cost Config once available.',
  'active'
FROM vehicle_profiles vp
WHERE vp.vehicle_class = '20ft_uhaul'
ON CONFLICT DO NOTHING;

INSERT INTO rental_rate_versions (
  provider, location, vehicle_profile_id, effective_from, daily_rate,
  included_km, per_mile_rate, per_km_rate, taxes_percent, protection_fee,
  source_document, status
)
SELECT
  'U-Haul',
  'Gas Plus Balzac, 10070 Hwy 566, Balzac, AB T4B 2T3',
  vp.id,
  '2026-07-22T00:00:00Z',
  67.00,
  0,
  2.40,
  round((2.40 / 1.609344)::numeric, 6),
  0,
  18.00,
  'ESTIMATED: scaled from the business''s confirmed 15ft rate ($40/day) using U-Haul''s public local daily-rate ratio (15ft $29.95 / 26ft $49.95 -> 1.668x). Per-mile rate carried over from the 15ft rate pending real 26ft invoice data. Correct via admin Cost Config once available.',
  'active'
FROM vehicle_profiles vp
WHERE vp.vehicle_class = '26ft_uhaul'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Updated labor rate: $20/hour per crew member (was $18), plus the
-- configurable time-block size. New version supersedes the old one
-- via the existing supersede trigger.
-- ------------------------------------------------------------
INSERT INTO labor_rate_versions (
  role_or_employee, effective_from, hourly_rate, burden_percent,
  overtime_rules, time_block_minutes, source, status
)
VALUES (
  'default_crew',
  now(),
  20.00,
  0,
  '{"overtime_after_hours_per_day":8,"overtime_after_hours_per_week":44,"overtime_multiplier":1.5}',
  30,
  'Crew labor: two people at $20/hour each, time estimated in 30-minute blocks; clock runs from leaving home until both return home.',
  'active'
)
ON CONFLICT DO NOTHING;
