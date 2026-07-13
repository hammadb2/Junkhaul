-- ============================================================
-- 20260723_arrival_windows_landfill_hours.sql
--
-- 1. Add open_time / close_time to landfills table
-- 2. Add arrival_window columns to schedule table
-- 3. Insert on-site duration estimates into system_config
-- ============================================================

-- 1. Landfill hours (Calgary landfills are 7 AM - 4 PM daily,
--    but Sunday winter closure is handled by summer_only_sunday flag)
ALTER TABLE landfills ADD COLUMN IF NOT EXISTS open_time TEXT DEFAULT '07:00';
ALTER TABLE landfills ADD COLUMN IF NOT EXISTS close_time TEXT DEFAULT '16:00';

-- Update existing landfill rows with correct hours
-- (All Calgary landfills are 7 AM - 4 PM)
UPDATE landfills SET open_time = '07:00', close_time = '16:00'
  WHERE open_time IS NULL OR close_time IS NULL;

-- 2. Schedule table: add window support
-- window_label: 'Morning' or 'Afternoon' (NULL for legacy pinpoint slots)
-- window_start / window_end: the time range the window covers ('HH:MM')
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS window_label TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS window_start TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS window_end TEXT;

-- Update the unique constraint to allow windows + pinpoint slots to coexist
-- The existing unique(slot_date, slot_time) stays — window-based rows will
-- use slot_time as the window start (e.g. '07:30' for Morning) so the
-- constraint still prevents duplicates.

-- 2b. Add window columns to bookings table so the booking record
-- carries the customer's chosen window for SMS/display purposes.
-- The internal assigned time stays in job_time (set by dispatch).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_window_label TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_window_start TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_window_end TEXT;

-- 3. On-site duration estimates per load size (minutes)
-- Used by /api/slots to compute whether a window can still make landfill closing
INSERT INTO system_config (key, value, description) VALUES
  ('onsite_duration_single_item', '20', 'On-site duration in minutes for a single item / 1-2 items'),
  ('onsite_duration_quarter', '40', 'On-site duration in minutes for a small load (quarter truck)'),
  ('onsite_duration_half', '60', 'On-site duration in minutes for a half load'),
  ('onsite_duration_full', '90', 'On-site duration in minutes for a three-quarter / full load'),
  ('landfill_unload_buffer_minutes', '30', 'Buffer time in minutes to unload at landfill before closing')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- 4. Window configuration
INSERT INTO system_config (key, value, description) VALUES
  ('dispatch_morning_window_start', '07:30', 'Start time for the morning arrival window'),
  ('dispatch_morning_window_end', '11:00', 'End time for the morning arrival window'),
  ('dispatch_afternoon_window_start', '11:00', 'Start time for the afternoon arrival window'),
  ('dispatch_afternoon_window_end', '15:00', 'End time for the afternoon arrival window'),
  ('dispatch_window_max_jobs', '4', 'Max jobs per arrival window (crew sequences these day-of)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
