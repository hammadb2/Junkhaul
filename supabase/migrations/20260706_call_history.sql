CREATE TABLE IF NOT EXISTS call_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_number text NOT NULL,
  caller_name text,
  vapi_call_id text,
  agent_name text,
  agent_type text,
  call_date timestamptz DEFAULT now(),
  duration_seconds integer DEFAULT 0,
  call_outcome text,
  call_summary text,
  transcript text,
  sentiment text DEFAULT 'neutral',
  ended_reason text,
  booking_ref text,
  follow_up_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_history_phone ON call_history(caller_number);
CREATE INDEX IF NOT EXISTS idx_call_history_date ON call_history(call_date DESC);

ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can access call_history" ON call_history;
CREATE POLICY "Service role can access call_history" ON call_history FOR ALL USING (true);
