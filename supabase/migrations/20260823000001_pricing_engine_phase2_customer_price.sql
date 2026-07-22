-- ============================================================
-- Pricing Engine Phase 2 — customer-facing price now comes from the
-- real internal cost engine (lib/pricing.js's quoteCustomerPrice)
-- instead of the flat per-load-size lookup. This migration adds the
-- one new column bookings needs to carry the AI-estimated cargo
-- volume that drives real truck selection, alongside the weight
-- estimate that already existed.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ai_volume_estimate_cuft numeric;

COMMENT ON COLUMN bookings.ai_volume_estimate_cuft IS
  'AI-estimated cargo volume (cubic feet) from photo/description analysis. Feeds truck selection (selectTruckFromProfiles) alongside ai_weight_estimate_kg — see lib/pricing.js quoteCustomerPrice.';

COMMENT ON COLUMN bookings.truck_size IS
  'Truck actually selected by the cost engine (smallest of 15/20/26ft that safely covers real weight AND volume) as of Pricing Engine Phase 2 — no longer the customer''s own truck-size selection in the booking UI.';
