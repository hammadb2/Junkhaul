-- ============================================================
-- Junk Haul Calgary — AI Narrator Migration
-- Date: 2026-07-12
-- Adds the ai_insights table for cached DeepSeek briefings and
-- two system_config rows: a kill switch and a refresh interval.
-- ============================================================

-- ============================================================
-- 1. AI_INSIGHTS — cached narrator briefings
--    Each row is one generated paragraph. The input_summary jsonb
--    column stores the exact data fed to the model so you can
--    audit what it was reasoning over if a briefing looks off.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  model text DEFAULT 'deepseek-v4-pro',
  input_summary jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_insights_generated_idx ON ai_insights (generated_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON ai_insights;
CREATE POLICY "Service role full access" ON ai_insights
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. CONFIG ROWS — kill switch + refresh interval
-- ============================================================
INSERT INTO system_config (key, value, value_type, description, category)
VALUES
  ('kill_switch_ai_narrator', 'true', 'boolean', 'Enable the AI narrator briefing on the Command Center', 'kill_switch'),
  ('ai_narrator_refresh_minutes', '15', 'number', 'Minimum minutes between DeepSeek regeneration calls', 'general')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
