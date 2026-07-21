-- ============================================================
-- Slot capacity guard
--
-- increment_slot() previously always incremented jobs_booked
-- unconditionally, with no check against max_jobs. Availability is
-- checked once, before payment (app/api/create-booking/route.js), then
-- the slot is actually reserved later when the Stripe deposit succeeds
-- (app/api/stripe-webhook/route.js). Two customers racing for the last
-- slot in a window could both pass the pre-payment availability check,
-- both pay, and both succeed at increment time, oversubscribing the
-- slot with no record that it happened.
--
-- Forward-only fix: increment_slot() now only applies the increment if
-- capacity remains, atomically, and reports whether it actually
-- reserved a slot so the caller can detect and alert on the race
-- instead of silently overselling.
-- ============================================================

-- Return type changes from void to boolean, so the existing function must
-- be dropped before being recreated (CREATE OR REPLACE cannot change a
-- function's return type).
drop function if exists increment_slot(date, text);

create function increment_slot(p_date date, p_time text)
returns boolean as $$
declare
  v_reserved boolean;
begin
  update schedule
  set jobs_booked = jobs_booked + 1,
      is_available = (jobs_booked + 1 < max_jobs)
  where slot_date = p_date and slot_time = p_time and jobs_booked < max_jobs;

  v_reserved := found;
  return v_reserved;
end;
$$ language plpgsql;
