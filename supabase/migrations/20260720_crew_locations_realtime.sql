-- Enable Supabase realtime on crew_locations (plural) table
-- This is the LIVE table that the web portal writes to every 30 seconds
-- via POST /api/employee/location. Enabling realtime allows the admin
-- live crew map to subscribe to position updates without polling.

-- Note: crew_location (singular) is dead code from an earlier build
-- and already has realtime enabled. This migration adds realtime to
-- the correct table that's actually being written to.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crew_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Add an index on updated_at for efficient querying of recently active crews
CREATE INDEX IF NOT EXISTS idx_crew_locations_updated_at
  ON crew_locations(updated_at DESC);
