-- ============================================================
-- Push Subscriptions — stores web push subscription endpoints
-- for each employee so we can send push notifications.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_employee ON push_subscriptions(employee_id);
