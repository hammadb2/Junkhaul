-- ============================================================
-- 24-Hour Dynamic Dispatch
--
-- 1. Add crew_assignment_id FK to bookings so multiple trucks
--    per day can be routed to the right crew.
-- 2. Seed system_config with dispatch tunables (max trucks/day,
--    detour threshold, truck capacity).
-- ============================================================

-- 1. Link bookings to a specific crew assignment (nullable for
--    backward compat — old bookings stay unlinked).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crew_assignment_id UUID REFERENCES crew_assignments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_crew_assignment ON bookings(crew_assignment_id);

-- 2. Dispatch config values (all have safe defaults in code).
INSERT INTO system_config (key, value, value_type, category, description) VALUES
  ('dispatch_max_trucks_per_day', '3', 'number', 'dispatch',
   'Maximum number of trucks/crews that can run in parallel on a single day. Raise this as you scale.'),
  ('dispatch_detour_threshold_km', '15', 'number', 'dispatch',
   'Maximum detour (km) a new booking can add to an existing route before a new truck is spawned.'),
  ('dispatch_truck_capacity_kg', '700', 'number', 'dispatch',
   'Truck capacity in kg for fill calculations. 15ft U-Haul = 700kg.'),
  ('dispatch_max_jobs_per_truck', '6', 'number', 'dispatch',
   'Maximum number of job stops per truck per day before spawning a new truck.'),
  ('dispatch_auto_assign', 'true', 'boolean', 'dispatch',
   'When true, resolveDispatch runs automatically on every new booking. Set false to go back to manual-only assignment.')
ON CONFLICT (key) DO NOTHING;
