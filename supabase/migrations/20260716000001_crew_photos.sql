-- ============================================================
-- 20260716000001_crew_photos.sql
--
-- crew_photos table for geotagged, timestamped job photos.
-- Used for:
--   - Arrival photos (3 required per spec)
--   - Drop-off photos at landfill/storage
--   - Truck bed photos
--   - Damage photos
--   - Dashboard photos (truck check)
--   - Gas receipt photos
--
-- Server-side payment validation checks this table before
-- accepting payment (requires 3 arrival photos + pickup signature).
-- ============================================================

CREATE TABLE IF NOT EXISTS crew_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT,
  employee_id UUID REFERENCES employees(id),
  photo_type TEXT NOT NULL, -- 'arrival', 'dropoff', 'truck_bed', 'damage', 'dashboard', 'gas_receipt'
  storage_path TEXT NOT NULL,
  photo_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_status TEXT DEFAULT 'synced' -- 'pending', 'syncing', 'synced', 'failed'
);

CREATE INDEX IF NOT EXISTS idx_crew_photos_booking ON crew_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_crew_photos_type ON crew_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_crew_photos_booking_type ON crew_photos(booking_id, photo_type);

ALTER TABLE crew_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_crew_photos" ON crew_photos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for crew photos (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('crew-photos', 'crew-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "crew_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'crew-photos');

CREATE POLICY "crew_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crew-photos');

CREATE POLICY "crew_photos_service_write" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'crew-photos');
