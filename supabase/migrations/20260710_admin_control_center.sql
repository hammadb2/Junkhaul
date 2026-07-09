-- ============================================================
-- Junk Haul Calgary — Admin Control Center Migration
-- Date: 2026-07-10
-- Adds runtime configuration, kill switches, and audit logging
-- for every automated system so the admin dashboard can observe
-- and control them without code changes.
-- ============================================================

-- ============================================================
-- 1. SYSTEM_CONFIG — runtime tunables and kill switches
--    Every value is a text string; the app coerces on read.
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  value_type text DEFAULT 'string' CHECK (value_type IN ('string','number','boolean','json')),
  description text,
  category text DEFAULT 'general',
  updated_by text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON system_config;
CREATE POLICY "Service role full access" ON system_config
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. SYSTEM_EVENTS — immutable audit log for every automated
--    action, pricing decision, and algorithmic output.
-- ============================================================
CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  customer_phone text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_events_booking_idx ON system_events (booking_id);
CREATE INDEX IF NOT EXISTS system_events_lead_idx ON system_events (lead_id);
CREATE INDEX IF NOT EXISTS system_events_type_idx ON system_events (event_type, created_at DESC);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON system_events;
CREATE POLICY "Service role full access" ON system_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. CRON_HEALTH — last run timestamp for each cron job
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_health (
  job_name text PRIMARY KEY,
  last_run_at timestamp with time zone,
  last_status text,
  last_payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE cron_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON cron_health;
CREATE POLICY "Service role full access" ON cron_health
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. DEFAULT KILL SWITCHES + DEFAULT TUNABLES
--    Defaults are intentionally "everything on" so existing
--    behavior is preserved. The admin UI can turn them off.
-- ============================================================
INSERT INTO system_config (key, value, value_type, description, category)
VALUES
  -- Kill switches (boolean)
  ('kill_switch_abandonment_followup', 'true', 'boolean', 'Enable the 3-touch abandonment SMS sequence', 'kill_switch'),
  ('kill_switch_opportunistic_live', 'true', 'boolean', 'Enable live opportunistic offers while truck is active', 'kill_switch'),
  ('kill_switch_opportunistic_proactive', 'true', 'boolean', 'Enable proactive morning pre-fill offers', 'kill_switch'),
  ('kill_switch_review_request', 'true', 'boolean', 'Enable automatic review request after job completion', 'kill_switch'),
  ('kill_switch_demand_snapshot', 'true', 'boolean', 'Enable demand snapshot logging for surge pricing', 'kill_switch'),
  ('kill_switch_surge_pricing', 'true', 'boolean', 'Enable surge pricing on new quotes', 'kill_switch'),
  ('kill_switch_no_show_check', 'true', 'boolean', 'Enable no-show check cron', 'kill_switch'),
  ('kill_switch_waitlist_expiry', 'true', 'boolean', 'Enable waitlist expiry cleanup', 'kill_switch'),
  ('kill_switch_slot_fill_alert', 'true', 'boolean', 'Enable slot fill alerts', 'kill_switch'),
  ('kill_switch_day_before_fill', 'true', 'boolean', 'Enable day-before fill alerts', 'kill_switch'),
  ('kill_switch_morning_reminders', 'true', 'boolean', 'Enable morning reminder SMS', 'kill_switch'),
  ('kill_switch_day_summary', 'true', 'boolean', 'Enable day summary SMS', 'kill_switch'),
  ('kill_switch_generate_slots', 'true', 'boolean', 'Enable weekly slot generation', 'kill_switch'),
  ('kill_switch_review_requests_edge', 'true', 'boolean', 'Enable edge-function review requests', 'kill_switch'),
  ('kill_switch_lead_followup', 'true', 'boolean', 'Enable legacy lead followup edge function', 'kill_switch'),
  ('kill_switch_risk_reminders', 'true', 'boolean', 'Enable high-risk extra reminders', 'kill_switch'),

  -- Pricing tunables (number)
  ('pricing_load_single_item', '99', 'number', 'Base price for single-item load', 'pricing'),
  ('pricing_load_quarter', '160', 'number', 'Base price for quarter load', 'pricing'),
  ('pricing_load_half', '240', 'number', 'Base price for half load', 'pricing'),
  ('pricing_load_full', '380', 'number', 'Base price for full load', 'pricing'),
  ('pricing_same_day', '50', 'number', 'Same-day rush fee', 'pricing'),
  ('pricing_stairs_per_flight', '25', 'number', 'Stairs fee per flight', 'pricing'),
  ('pricing_freon_per_item', '40', 'number', 'Freon appliance fee per item', 'pricing'),
  ('pricing_early_bird_hour', '7', 'number', 'Hour of day that triggers early-bird discount', 'pricing'),
  ('pricing_early_bird_multiplier', '0.95', 'number', 'Early-bird discount multiplier', 'pricing'),
  ('pricing_surcharge_min', '0.75', 'number', 'Minimum combined early-bird + surge multiplier', 'pricing'),
  ('pricing_surcharge_max', '1.40', 'number', 'Maximum combined early-bird + surge multiplier', 'pricing'),

  -- Surge tunables (number)
  ('surge_min_multiplier', '0.85', 'number', 'Surge floor', 'surge'),
  ('surge_max_multiplier', '1.30', 'number', 'Surge ceiling', 'surge'),
  ('surge_min_snapshots_for_baseline', '8', 'number', 'Minimum snapshots before learned mode', 'surge'),
  ('surge_pace_coefficient', '0.6', 'number', 'How much pace delta moves price', 'surge'),
  ('surge_bootstrap_fill_90', '1.20', 'number', 'Bootstrap multiplier at >=90% fill', 'surge'),
  ('surge_bootstrap_fill_75_3d', '1.12', 'number', 'Bootstrap multiplier at >=75% fill with <=3 days out', 'surge'),
  ('surge_bootstrap_fill_25_2d', '0.92', 'number', 'Bootstrap multiplier at <=25% fill with <=2 days out', 'surge'),

  -- Opportunistic discount curve tunables (number)
  ('discount_fill_factor_max', '25', 'number', 'Max percentage discount from empty fill factor', 'discount'),
  ('discount_detour_penalty_per_km', '1.0', 'number', 'Discount percentage penalty per km of detour', 'discount'),
  ('discount_late_day_start_hour', '15', 'number', 'Hour of day that triggers late-day bonus', 'discount'),
  ('discount_late_day_bonus_per_hour', '2.5', 'number', 'Extra discount per hour after late-day start', 'discount'),
  ('discount_slow_day_threshold', '3', 'number', 'Bookings below this get slow-day bonus', 'discount'),
  ('discount_slow_day_bonus', '5', 'number', 'Bonus discount when bookings below threshold', 'discount'),
  ('discount_very_slow_day_threshold', '2', 'number', 'Bookings below this get additional bonus', 'discount'),
  ('discount_very_slow_day_bonus', '3', 'number', 'Additional discount for very slow days', 'discount'),
  ('discount_max_pct', '40', 'number', 'Maximum discount percentage', 'discount'),
  ('discount_floor_min_pct', '60', 'number', 'Minimum discounted price as % of original', 'discount'),
  ('discount_touch_3_amount', '15', 'number', 'Dollar-off amount in the T+47hr abandonment message', 'discount'),
  ('discount_referrer_reward', '20', 'number', 'Referral reward in dollars', 'referral'),
  ('discount_referee_reward', '20', 'number', 'Referral reward for referee in dollars', 'referral'),

  -- No-show risk tunables (number)
  ('risk_lead_gt_7d', '35', 'number', 'No-show risk points for lead time >7 days', 'no_show'),
  ('risk_lead_gt_5d', '25', 'number', 'No-show risk points for lead time >5 days', 'no_show'),
  ('risk_lead_gt_3d', '15', 'number', 'No-show risk points for lead time >3 days', 'no_show'),
  ('risk_lead_gt_1d', '5', 'number', 'No-show risk points for lead time >1 day', 'no_show'),
  ('risk_no_photo', '20', 'number', 'No-show risk points for skipped photo', 'no_show'),
  ('risk_phone_source', '10', 'number', 'No-show risk points for phone/vapi source', 'no_show'),
  ('risk_rescheduled', '25', 'number', 'No-show risk points for rescheduled once', 'no_show'),
  ('risk_time_0730', '10', 'number', 'No-show risk points for 7:30 AM slot', 'no_show'),
  ('risk_time_0900', '5', 'number', 'No-show risk points for 9:00 AM slot', 'no_show'),
  ('risk_sunday', '5', 'number', 'No-show risk points for Sunday job', 'no_show'),

  -- Cancellation / reschedule tunables (number)
  ('cancellation_full_refund_hours', '24', 'number', 'Hours before job for full deposit refund', 'cancellation'),
  ('cancellation_partial_hours', '2', 'number', 'Hours before job for non-refundable deposit', 'cancellation'),
  ('reschedule_max_count', '2', 'number', 'Maximum reschedules per booking', 'reschedule'),

  -- Abandonment timing (number)
  ('abandonment_touch_1_hours', '1', 'number', 'Hours after quote for abandonment touch 1', 'abandonment'),
  ('abandonment_touch_2_hours', '20', 'number', 'Hours after quote for abandonment touch 2', 'abandonment'),
  ('abandonment_touch_3_hours', '47', 'number', 'Hours after quote for abandonment touch 3', 'abandonment')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
