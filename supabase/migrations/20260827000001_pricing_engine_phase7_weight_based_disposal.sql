-- ============================================================
-- Pricing Engine Phase 7 — weight-based landfill charges.
--
-- facility_rate_versions.per_tonne_rate has existed in the schema since
-- Phase 1 but was never actually read by the cost engine's
-- computeFacilityCost (lib/costConfig.js) -- disposal cost was just the
-- flat $80 minimum regardless of how much the job actually weighed, real
-- Calgary landfill billing is per-tonne. lib/disposal.js's separate
-- crew-side reconciliation system already used a per-tonne formula and
-- already documents the real rate this business has been quoted:
-- $120/tonne (see lib/itemPricing.js's header comment) -- this
-- migration sets that same rate on the active facility_rate_versions
-- row so the ACTUAL cost engine (the one that sets the customer's
-- price) and the crew-side actual-cost reconciliation are now computed
-- the same way, instead of two silently different disposal models.
--
-- flat_minimum stays at the business's own observed $80 (unchanged) --
-- it's a floor: a job's disposal cost is never less than the facility's
-- minimum gate fee, but now correctly scales up with weight above ~667kg
-- (80 / 120 * 1000) instead of staying flat at $80 forever regardless of
-- how much the truck actually hauled to the landfill.
-- ============================================================

INSERT INTO facility_rate_versions (
  facility, waste_stream, effective_from, flat_minimum, per_tonne_rate,
  surcharges, item_fees, tax_treatment, source, status
)
VALUES (
  'East Calgary Landfill',
  'general_junk',
  now(),
  80.00,
  120.00,
  '{}',
  '{}',
  'included',
  'Real per-tonne rate this business has been quoted at Calgary landfills ($120/tonne), previously only used by lib/disposal.js''s crew-side reconciliation model and not by the actual pricing cost engine. Correct via admin Cost Config once a current invoice is available.',
  'active'
)
ON CONFLICT DO NOTHING;
