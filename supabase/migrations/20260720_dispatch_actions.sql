-- Dispatch AI agent audit log
CREATE TABLE IF NOT EXISTS dispatch_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  caller_phone text,
  employee_id uuid REFERENCES employees(id),
  booking_id uuid,
  details text,
  tier text DEFAULT 'A',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_actions_created_at ON dispatch_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_actions_employee ON dispatch_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_actions_booking ON dispatch_actions(booking_id);

-- RLS: only service role can read/write (admin panel uses service role)
ALTER TABLE dispatch_actions ENABLE ROW LEVEL SECURITY;
