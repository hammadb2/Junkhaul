-- ============================================================
-- Remove the duplicate pg_cron schedule for run-payroll (audit E3).
--
-- run-payroll was scheduled twice: pg_cron here
-- (20260707_employee_portal.sql, '0 9 * * 5') AND vercel.json
-- ('0 10 * * 5') -- both firing every Friday, one hour apart. Vercel
-- Cron already handles a once-weekly schedule fine (the Hobby-plan
-- restriction that pushed other crons onto pg_cron only blocks
-- schedules MORE frequent than once/day), so the pg_cron copy here
-- was pure redundant duplication, not something covering a gap.
--
-- Combined with the sequential period-math fix in
-- app/api/cron/run-payroll/route.js, this leaves exactly one
-- scheduler (Vercel Cron, once weekly) calling an endpoint that now
-- correctly no-ops until a full 14-day period has actually elapsed.
-- ============================================================

DO $$ BEGIN PERFORM cron.unschedule('run-payroll'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
