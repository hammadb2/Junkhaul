-- Safety alerts — internal-only log for the photo AI's narrow
-- safety-emergency exception. NEVER surfaced to customers.
-- Rows are written by lib/ai.js handleSafetyAlert() and reviewed
-- by the operator in the admin dashboard.

CREATE TABLE IF NOT EXISTS safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary TEXT NOT NULL,                 -- short factual summary from the AI (no PII)
  source TEXT,                            -- 'web' | 'sms' | 'whatsapp'
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  lead_phone TEXT,                        -- customer phone if known (for follow-up)
  photo_urls JSONB,                       -- array of photo URLs that triggered the alert
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,                -- when the operator acknowledged it
  reviewed_by TEXT,                       -- operator handle / email
  resolution_notes TEXT,                  -- what the operator did about it
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_created ON safety_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_unreviewed ON safety_alerts(created_at DESC) WHERE reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_safety_alerts_booking ON safety_alerts(booking_id);

-- Row-level security: only authenticated admin/crew users can read.
-- Customers never have direct DB access, but defence in depth.
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_alerts_admin_read" ON safety_alerts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "safety_alerts_admin_write" ON safety_alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
