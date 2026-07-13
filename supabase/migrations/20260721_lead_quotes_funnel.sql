-- Lead quotes history table + funnel tracking columns on leads.
-- 1. lead_quotes: one row per price_reveal (instead of overwriting leads.ai_price_estimate)
-- 2. leads.last_step_reached + last_step_at: funnel drop-off tracking

CREATE TABLE IF NOT EXISTS lead_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  price integer NOT NULL,
  load_size text,
  photos text[],
  itemized jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON lead_quotes;
CREATE POLICY "Service role full access" ON lead_quotes
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS lead_quotes_lead_id_idx ON lead_quotes (lead_id, created_at DESC);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_step_reached text,
  ADD COLUMN IF NOT EXISTS last_step_at timestamp with time zone;
