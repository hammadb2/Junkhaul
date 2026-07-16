-- ============================================================
-- geofence_events: add region metadata columns
--
-- The crew app geofence service records transitions for arbitrary
-- regions (customer sites, landfills, storage yards, the truck).
-- Previously the table only had a free-text `booking_id` column,
-- which conflated customer booking IDs with non-customer region IDs.
-- These columns make the region identity and type explicit.
-- ============================================================

ALTER TABLE geofence_events
  ADD COLUMN IF NOT EXISTS region_id text,
  ADD COLUMN IF NOT EXISTS region_type text
    CHECK (region_type IS NULL OR region_type IN (
      'customer', 'landfill', 'storage', 'truck'
    ));

CREATE INDEX IF NOT EXISTS geofence_events_region_idx
  ON geofence_events (region_id, event_type);
CREATE INDEX IF NOT EXISTS geofence_events_employee_ts_idx
  ON geofence_events (employee_id, timestamp DESC);
