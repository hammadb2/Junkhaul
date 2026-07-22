-- ============================================================
-- Pricing Engine Phase 10 — conversational AI booking flow.
--
-- Adds alongside the existing static multi-step form at /book (not a
-- replacement — see app/book/chat/page.js), reusing the same
-- quote/booking pipeline (quoteCustomerPrice, createQuoteDecision,
-- create-booking's core logic) so a chat-booked job is priced and
-- gated identically to a form-booked one.
--
-- One row per chat session. Message history and collected booking
-- fields are persisted so a customer can resume a conversation (e.g.
-- reload the page) without losing progress.
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  collected_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_booking_sessions_session_id ON chat_booking_sessions(session_id);

CREATE OR REPLACE FUNCTION update_chat_booking_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_booking_sessions_updated_at ON chat_booking_sessions;
CREATE TRIGGER trg_chat_booking_sessions_updated_at
  BEFORE UPDATE ON chat_booking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_booking_sessions_updated_at();

ALTER TABLE chat_booking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_chat_booking_sessions" ON chat_booking_sessions;
CREATE POLICY "service_role_all_chat_booking_sessions" ON chat_booking_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
