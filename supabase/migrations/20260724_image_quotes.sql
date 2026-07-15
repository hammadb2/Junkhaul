-- One row per unique image, keyed by its content hash (the "image ID").
-- The UNIQUE constraint on image_id is what makes the "same image never
-- gets a different result" guarantee airtight, even under concurrent
-- requests for a brand-new photo.

create table if not exists image_quotes (
  id uuid primary key default gen_random_uuid(),
  image_id text unique not null,        -- sha256 hash of the raw image bytes
  scan_result jsonb not null,           -- raw structured facts Gemini returned
  quote_result jsonb,                   -- nullable: booking-level price is computed by aggregating across all photos for that booking, not stored per-image
  created_at timestamptz not null default now()
);

create index if not exists idx_image_quotes_image_id on image_quotes (image_id);
