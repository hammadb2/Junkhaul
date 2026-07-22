-- ============================================================
-- Pricing Engine Phase 5 — refrigerant/freon evidence workflow.
--
-- Before this migration, has_freon/freon_count were pure customer
-- self-report (or a keyword-regex AI guess) with no way to avoid the
-- flat $40/appliance fee other than the customer's own unverifiable
-- word. This adds a photo-evidence-gated exemption path: the AI vision
-- scan (app/api/photo-quote/route.js) now also looks for a technician
-- evacuation sticker on refrigerant-containing appliances. The freon
-- fee is STILL charged in full at booking time regardless of any claim
-- (never a silent discount from an unverified photo read) -- a claim
-- only routes the booking into a staff review queue that can credit the
-- fee back once a human actually confirms the sticker in the photo.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS freon_evacuation_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS freon_evacuation_status text NOT NULL DEFAULT 'not_claimed'
    CHECK (freon_evacuation_status IN ('not_claimed','pending_review','verified','rejected')),
  ADD COLUMN IF NOT EXISTS freon_evacuation_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS freon_evacuation_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS freon_evacuation_review_note text;

COMMENT ON COLUMN bookings.freon_evacuation_claimed IS
  'True when the AI photo scan reported seeing what looks like a refrigerant-evacuation technician sticker on a fridge/freezer/AC unit in this booking''s photos. Never auto-waives the freon fee -- only routes to freon_evacuation_status=pending_review for a human to verify against the actual photo.';
COMMENT ON COLUMN bookings.freon_evacuation_status IS
  'not_claimed (default, fee stands) / pending_review (AI reported a sticker, awaiting staff verification) / verified (staff confirmed -- fee credit owed, applied manually) / rejected (staff looked and it was not a valid sticker -- fee stands).';
