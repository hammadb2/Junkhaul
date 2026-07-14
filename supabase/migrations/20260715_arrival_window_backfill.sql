-- ============================================================
-- ONE-TIME BACKFILL: convert legacy pinpoint schedule rows to
-- Morning / Afternoon arrival windows.
--
-- Aligned with the current generate-slots format:
--   2 windows per day: 07:30 Morning (07:30-11:00) and
--   11:00 Afternoon (11:00-15:00), max_jobs = 4.
-- ============================================================

-- 1. Add arrival-window columns (no-op if they already exist).
ALTER TABLE schedule
  ADD COLUMN IF NOT EXISTS window_label text,
  ADD COLUMN IF NOT EXISTS window_start text,
  ADD COLUMN IF NOT EXISTS window_end text;

-- 2. Remove unbooked legacy rows for today onward so they can be regenerated
--    as windowed slots. These were created by the old generate-slots upsert
--    and are stuck with window_label IS NULL.
DELETE FROM schedule
WHERE slot_date >= CURRENT_DATE
  AND jobs_booked = 0
  AND window_label IS NULL;

-- 3. Backfill window labels for rows that already have bookings.
--    Keep them at max_jobs = 4 (or jobs_booked, if already overbooked)
--    so we do not silently open up new spots on a customer's already-booked
--    pinpoint slot.
UPDATE schedule
SET
  window_label = CASE
    WHEN slot_time IN ('07:30', '09:00') THEN 'Morning'
    WHEN slot_time IN ('11:00', '13:00', '15:00') THEN 'Afternoon'
  END,
  window_start = CASE
    WHEN slot_time IN ('07:30', '09:00') THEN '07:30'
    WHEN slot_time IN ('11:00', '13:00', '15:00') THEN '11:00'
  END,
  window_end = CASE
    WHEN slot_time IN ('07:30', '09:00') THEN '11:00'
    WHEN slot_time IN ('11:00', '13:00', '15:00') THEN '15:00'
  END,
  max_jobs = GREATEST(jobs_booked, 4),
  is_available = (jobs_booked < GREATEST(jobs_booked, 4))
WHERE slot_date >= CURRENT_DATE
  AND window_label IS NULL;

-- 4. Re-populate standard arrival-window slots from today forward.
--    Generates every day (not just Thu/Sun) and skips statutory holidays.
--    ON CONFLICT ignores existing bookings (we already backfilled those).
INSERT INTO schedule (
  slot_date,
  slot_time,
  day_type,
  max_jobs,
  jobs_booked,
  is_available,
  window_label,
  window_start,
  window_end
)
SELECT
  (CURRENT_DATE + i) AS slot_date,
  s.slot_time,
  CASE EXTRACT(DOW FROM (CURRENT_DATE + i))
    WHEN 0 THEN 'sunday'
    WHEN 6 THEN 'saturday'
    ELSE 'weekday'
  END,
  4, 0, true,
  s.window_label,
  s.window_start,
  s.window_end
FROM generate_series(0, 111) AS i
CROSS JOIN (
  VALUES
    ('07:30', 'Morning', '07:30', '11:00'),
    ('11:00', 'Afternoon', '11:00', '15:00')
) AS s(slot_time, window_label, window_start, window_end)
WHERE (CURRENT_DATE + i) NOT IN (
    '2026-08-03', '2026-09-07', '2026-10-12', '2026-11-11',
    '2026-12-25', '2026-12-26', '2027-01-01', '2027-02-15',
    '2027-04-02', '2027-05-24', '2027-07-01', '2027-08-02'
  )
ON CONFLICT (slot_date, slot_time) DO NOTHING;
