-- Adds kill switches for the remaining Supabase Edge Functions
INSERT INTO system_config (key, value, value_type, description, category)
VALUES
  ('kill_switch_day_summary', 'true', 'boolean', 'Enable day summary SMS', 'kill_switch'),
  ('kill_switch_generate_slots', 'true', 'boolean', 'Enable weekly slot generation', 'kill_switch'),
  ('kill_switch_review_requests_edge', 'true', 'boolean', 'Enable edge-function review requests', 'kill_switch'),
  ('kill_switch_lead_followup', 'false', 'boolean', 'Legacy lead followup is disabled by default', 'kill_switch'),
  ('kill_switch_risk_reminders', 'true', 'boolean', 'Enable high-risk extra reminders', 'kill_switch')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
