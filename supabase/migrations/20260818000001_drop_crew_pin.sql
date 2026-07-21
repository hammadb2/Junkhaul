-- ============================================================
-- Drop the crew_pin table — PIN-based crew auth removed.
--
-- Confirmed unused before removal: crew_pin.updated_at unchanged
-- since 2026-07-06 (the single shared PIN hash was never rotated),
-- and crew_location (the PIN app's own GPS table) has zero rows,
-- ever, versus employee_sessions (the session-based app actually in
-- use) showing real, recent activity. All PIN-only routes and the
-- x-crew-pin fallback on the remaining dual-auth routes were already
-- removed in a prior migration/commit (lib/crewAuth.js deleted in the
-- same change as this one). This table has no remaining reader or
-- writer in the codebase.
--
-- Does not touch crew_location — that table is a separate concern
-- (which live-GPS table is canonical) and is still read as a
-- fallback data source by /api/track/[token].
-- ============================================================

drop table if exists crew_pin;
