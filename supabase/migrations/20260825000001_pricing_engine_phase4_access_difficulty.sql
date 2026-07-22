-- ============================================================
-- Pricing Engine Phase 4 — stairs/access difficulty becomes a
-- CALCULATED labor-time cost instead of a flat $25/flight surcharge.
--
-- Each flight of stairs adds real minutes to the crew's on-site time
-- (carrying items up/down takes measurably longer than a ground-floor
-- carry-out), which flows through the existing time-based labor cost
-- calculation (computeLaborCost) and is priced with the same target
-- margin as everything else — instead of a flat number unrelated to
-- the job's actual size or the crew's actual hourly cost.
-- ============================================================

ALTER TABLE labor_rate_versions
  ADD COLUMN IF NOT EXISTS stairs_minutes_per_flight numeric NOT NULL DEFAULT 8;

COMMENT ON COLUMN labor_rate_versions.stairs_minutes_per_flight IS
  'Extra crew on-site minutes added per flight of stairs at the customer stop (both directions combined) — carrying items up/down stairs takes real extra time. ESTIMATE pending real job-timing data; correct via admin Cost Config once available. Feeds computeLaborCost via the job''s total on-site minutes, replacing the old flat stairs_per_flight surcharge.';
