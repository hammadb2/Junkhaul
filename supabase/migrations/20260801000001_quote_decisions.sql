-- ============================================================
-- Junk Haul Calgary — No-loss Quote Decision Service
-- Date: 2026-08-01
--
-- Every price presented to a customer, agent, employee, webhook or
-- legacy path is approved server-side before a deposit PaymentIntent
-- is created or a booking is confirmed. Overrides are recorded with
-- reason, identity, timestamp and audit event; the cost is never
-- silently edited.
-- ============================================================

-- ============================================================
-- QUOTE DECISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_decision_ref TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft','needs_evidence','manual_review','approved','expired','superseded','rejected','booked')),
  quote_snapshot JSONB NOT NULL,
  cost_snapshot JSONB,
  price_cents INTEGER NOT NULL,
  minimum_price_cents INTEGER NOT NULL,
  proposed_price_cents INTEGER,
  margin_percent NUMERIC(5,2),
  contribution_cents INTEGER NOT NULL DEFAULT 0,
  policy_version_id UUID,
  expiry_at TIMESTAMPTZ NOT NULL,
  decision_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  authorized_at TIMESTAMPTZ,
  authorization_reason TEXT,
  authorization_limit_cents INTEGER,
  deposit_cents INTEGER NOT NULL DEFAULT 5000,
  superseded_by UUID REFERENCES quote_decisions(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_decisions_state ON quote_decisions(state);
CREATE INDEX IF NOT EXISTS idx_quote_decisions_booking ON quote_decisions(booking_id);
CREATE INDEX IF NOT EXISTS idx_quote_decisions_expiry ON quote_decisions(expiry_at);
CREATE INDEX IF NOT EXISTS idx_quote_decisions_ref ON quote_decisions(quote_decision_ref);

-- ============================================================
-- QUOTE DECISION EVENTS — explicit audit trail for state changes
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_decision_id UUID NOT NULL REFERENCES quote_decisions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_decision_events_decision ON quote_decision_events(quote_decision_id, created_at DESC);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_quote_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_decisions_updated_at ON quote_decisions;
CREATE TRIGGER trg_quote_decisions_updated_at
  BEFORE UPDATE ON quote_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_decisions_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE quote_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_decision_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_quote_decisions" ON quote_decisions;
CREATE POLICY "service_role_all_quote_decisions" ON quote_decisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_quote_decision_events" ON quote_decision_events;
CREATE POLICY "service_role_all_quote_decision_events" ON quote_decision_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Link bookings to the winning quote decision
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_decision_id UUID REFERENCES quote_decisions(id) ON DELETE SET NULL;
ALTER TABLE quote_price_ledger ADD COLUMN IF NOT EXISTS quote_decision_id UUID REFERENCES quote_decisions(id) ON DELETE SET NULL;
