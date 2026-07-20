-- ============================================================
-- Junkhaul Calgary — AI review and model-quality reporting
-- Date: 2026-08-04
--
-- Stores aggregated model-quality snapshots and per-analysis metrics so
-- staff can prove the AI is safe before scaling automatic quotes.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_quality_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL, -- daily, weekly, monthly
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_analyses INTEGER NOT NULL DEFAULT 0,
  auto_approved_count INTEGER NOT NULL DEFAULT 0,
  manual_correction_count INTEGER NOT NULL DEFAULT 0,
  manual_rejection_count INTEGER NOT NULL DEFAULT 0,
  underestimation_count INTEGER NOT NULL DEFAULT 0,
  range_coverage_percent NUMERIC NOT NULL DEFAULT 0,
  provider_failure_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER,
  avg_cost_cents NUMERIC,
  model_version TEXT,
  provider TEXT,
  category_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_period ON ai_quality_snapshots(period, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quality_model ON ai_quality_snapshots(model_version, provider);

-- Per-analysis quality row for drill-down.
CREATE TABLE IF NOT EXISTS ai_analysis_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES item_observations(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  model_version TEXT,
  provider TEXT,
  category TEXT,
  actual_weight_kg NUMERIC,
  predicted_min_kg NUMERIC,
  predicted_max_kg NUMERIC,
  predicted_likely_kg NUMERIC,
  corrected BOOLEAN NOT NULL DEFAULT false,
  correction_reason TEXT,
  latency_ms INTEGER,
  cost_cents NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_quality_obs ON ai_analysis_quality(observation_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_quality_booking ON ai_analysis_quality(booking_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_quality_created ON ai_analysis_quality(created_at DESC);

ALTER TABLE ai_quality_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_quality ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_quality_snapshots' AND policyname = 'service_role_all_ai_quality_snapshots') THEN
    CREATE POLICY service_role_all_ai_quality_snapshots ON ai_quality_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_analysis_quality' AND policyname = 'service_role_all_ai_analysis_quality') THEN
    CREATE POLICY service_role_all_ai_analysis_quality ON ai_analysis_quality FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
