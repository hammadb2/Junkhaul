ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos jsonb DEFAULT '[]';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_photos_taken_at timestamp;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_arrived_at timestamp;
