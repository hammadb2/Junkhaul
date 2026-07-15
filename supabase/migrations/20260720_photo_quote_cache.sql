CREATE TABLE IF NOT EXISTS photo_quote_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_hash text NOT NULL UNIQUE,
  phone text,
  session_id text,
  analysis_json jsonb NOT NULL,
  itemized_json jsonb NOT NULL,
  price_json jsonb,
  photo_urls text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 0,
  last_accessed timestamptz
);

CREATE INDEX IF NOT EXISTS idx_photo_quote_cache_hash ON photo_quote_cache(photo_hash);
CREATE INDEX IF NOT EXISTS idx_photo_quote_cache_phone ON photo_quote_cache(phone);
CREATE INDEX IF NOT EXISTS idx_photo_quote_cache_session ON photo_quote_cache(session_id);
