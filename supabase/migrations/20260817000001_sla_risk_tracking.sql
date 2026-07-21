-- ============================================================
-- 24-hour guarantee at-risk tracking
--
-- Adds a dedicated idempotency flag for the at-risk-of-missing-the-
-- 24-hour-guarantee cron, matching the existing pattern used for the
-- abandonment-followup sequence (leads.follow_up_sent /
-- abandonment_sms_sent / final_reminder_sent): a boolean/timestamp flag
-- on the source row rather than querying the alerts table each run.
-- ============================================================

alter table bookings add column if not exists sla_risk_alerted_at timestamptz;
