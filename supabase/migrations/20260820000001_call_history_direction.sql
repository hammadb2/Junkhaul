-- ============================================================
-- call_history has no direction column, so the admin Calls tab
-- (CallsPanel.js, reading call_history) can't distinguish inbound
-- from outbound calls, even though phone_calls (a separate table,
-- never rendered anywhere in admin) already computes and stores this
-- at write time in every call-ingestion path (app/api/vapi/route.js,
-- app/api/quo-calls/route.js, lib/vapiTools.js's escalate_to_human).
-- Adding the same column to call_history so recordCallHistory() can
-- pass through the already-known value instead of duplicating call
-- visibility across two disconnected tables.
-- ============================================================

alter table call_history add column if not exists direction text check (direction in ('inbound','outbound'));
