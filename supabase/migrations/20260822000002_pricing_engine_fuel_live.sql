-- ============================================================
-- Pricing Engine Phase 1 — live fuel price support.
--
-- fuel_rate_versions already stores price_per_litre and a flat
-- quote_safety_l_per_100km. Per-truck consumption now lives on each
-- vehicle_profiles row (fuel_baseline_l_per_100km), so this adds the
-- missing piece: a configurable safety-buffer PERCENT applied on top
-- of whichever truck is doing the job (idling, traffic, detours,
-- landfill lineups, winter conditions, route inaccuracies), plus a
-- source/fetched_at pair so every quote can show exactly which price
-- was used and when it was pulled.
-- ============================================================

ALTER TABLE fuel_rate_versions
  ADD COLUMN IF NOT EXISTS fuel_safety_buffer_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_live_fetch boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fuel_rate_versions.fuel_safety_buffer_percent IS
  'Percent added on top of a truck''s own fuel_baseline_l_per_100km to cover idling, traffic, detours, landfill lineups, winter conditions, and route inaccuracies.';
COMMENT ON COLUMN fuel_rate_versions.fetched_at IS
  'When price_per_litre was actually retrieved from the live source (null for a hand-entered fallback row).';
COMMENT ON COLUMN fuel_rate_versions.is_live_fetch IS
  'true if this row came from the automated live fuel-price fetch; false for a manually-entered/fallback row.';

-- Mark the existing hand-entered row explicitly as the non-live baseline
-- (it predates the live-fetch cron and should keep acting as the
-- fallback price if the live fetch is ever unavailable).
UPDATE fuel_rate_versions
SET is_live_fetch = false
WHERE status = 'active' AND is_live_fetch IS NOT TRUE;
