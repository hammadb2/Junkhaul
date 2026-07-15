-- Add possible_cross_photo_duplicates to bookings table
-- This stores labels that appeared across multiple photos and might
-- be the same physical item photographed twice. The crew confirms
-- at pickup rather than the system guessing.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS possible_cross_photo_duplicates JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS photo_quote_tier TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS photo_quote_volume_cuft NUMERIC;
