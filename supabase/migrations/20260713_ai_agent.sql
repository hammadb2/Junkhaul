-- AI Agent: functional agent that can take actions (not just briefings)
-- Creates ai_agent_actions table and adds kill switch config

-- ============================================================
-- 1. AI Agent Actions log
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  arguments JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent_actions
  ADD COLUMN IF NOT EXISTS tool_name TEXT,
  ADD COLUMN IF NOT EXISTS arguments JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_created_at
  ON ai_agent_actions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_tool
  ON ai_agent_actions (tool_name);

-- ============================================================
-- 2. Kill switch for the AI agent (default: ON)
-- ============================================================
INSERT INTO system_config (key, value, value_type, description, category)
VALUES (
  'kill_switch_ai_agent',
  'true',
  'boolean',
  'Master kill switch for the functional AI agent. When off, the agent can take actions (send SMS, trigger calls, update config, etc). When on, the agent is disabled.',
  'kill_switch'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. Agent model config
-- ============================================================
INSERT INTO system_config (key, value, value_type, description, category)
VALUES (
  'ai_agent_model',
  'deepseek-chat',
  'string',
  'Which DeepSeek model to use for the functional AI agent. deepseek-chat is fast and supports function calling.',
  'general'
)
ON CONFLICT (key) DO NOTHING;
