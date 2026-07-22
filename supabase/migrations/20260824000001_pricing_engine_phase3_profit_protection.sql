-- ============================================================
-- Pricing Engine Phase 3 — profit protection (min $ profit AND min
-- margin %, not just the target-margin price floor) and quote
-- confidence scoring for instant-book vs manual-review gating.
--
-- Before this migration, pricing_policy_versions.minimum_contribution_percent
-- and review_thresholds already existed in the schema and the admin UI,
-- but were never actually read by lib/quoteDecision.js's decide() — the
-- only enforced floor was the target-margin-derived minimum_price_cents.
-- This migration adds the missing dollar floor; the code changes
-- alongside it (lib/quoteDecision.js) wire both existing-but-dead fields
-- and the new one into the actual decision logic.
-- ============================================================

ALTER TABLE pricing_policy_versions
  ADD COLUMN IF NOT EXISTS minimum_contribution_dollars numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN pricing_policy_versions.minimum_contribution_dollars IS
  'Hard floor on absolute dollar profit (contribution = price - cost) per job, in dollars (matches the numeric-dollar convention of every other rate in this table). A quote below this is sent to manual review even if its percentage margin looks acceptable on a very small job. Distinct from minimum_contribution_percent (a percentage floor) and target_margin_percent (used to SET the price, not just floor it).';

ALTER TABLE quote_decisions
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS confidence_tier text CHECK (confidence_tier IN ('high','medium','low') OR confidence_tier IS NULL);

COMMENT ON COLUMN quote_decisions.confidence_score IS
  '0-100 score blending evidence completeness, AI estimate confidence, and margin buffer above the profit floor. See lib/quoteDecision.js computeConfidenceScore.';
COMMENT ON COLUMN quote_decisions.confidence_tier IS
  'high/medium/low bucket of confidence_score. A low tier forces manual_review regardless of price, even when the margin and evidence checks would otherwise approve instantly.';
