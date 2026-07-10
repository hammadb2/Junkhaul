-- ============================================================
-- Customer Tracking Portal — feedback & tips tables
-- ============================================================

-- Customer feedback (star rating + review) submitted via tracking page
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_booking ON customer_feedback(booking_id);

-- Crew tips (processed via Stripe on the tracking page)
CREATE TABLE IF NOT EXISTS crew_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  assignment_id UUID REFERENCES crew_assignments(id),
  amount_cad NUMERIC NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'pending', -- pending → succeeded → failed
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crew_tips_booking ON crew_tips(booking_id);
CREATE INDEX IF NOT EXISTS idx_crew_tips_assignment ON crew_tips(assignment_id);
