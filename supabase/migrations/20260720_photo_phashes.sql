-- ============================================================
-- Photo perceptual hashes (dHash) for similarity detection.
--
-- Stores a 128-bit dHash for each customer photo upload so that a
-- subsequent upload from the same customer can be compared against
-- their previous uploads. When a similar photo is found (above the
-- similarity threshold), the system runs a diff-based analysis
-- instead of a full re-analysis, locking prices for unchanged items
-- to their originally quoted amounts.
--
-- Scoped per-customer: never compared across different customers.
-- ============================================================

CREATE TABLE IF NOT EXISTS photo_phashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  session_id text,
  phash text NOT NULL,
  photo_hash text NOT NULL,
  analysis_json jsonb,
  itemized_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_phashes_phone ON photo_phashes(phone);
CREATE INDEX IF NOT EXISTS idx_photo_phashes_session ON photo_phashes(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_phashes_phone_phash
  ON photo_phashes(phone, phash) WHERE phone IS NOT NULL;
