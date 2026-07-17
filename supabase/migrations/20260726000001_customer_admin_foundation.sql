-- Customer/admin foundation: attribution, campaigns, Quo context, donations,
-- immutable price history, unified timeline/audit, and manager permissions.
-- Existing concepts are extended where safe:
-- - leads/bookings/messages/waitlist/phone_calls remain canonical records.
-- - system_events remains legacy audit; timeline_events/audit_events are the
--   typed append-only replacements for new workflows.

-- ---------- Existing table extensions ----------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS attribution_record_id uuid,
  ADD COLUMN IF NOT EXISTS first_touch_attribution_id uuid,
  ADD COLUMN IF NOT EXISTS last_touch_attribution_id uuid,
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_step text,
  ADD COLUMN IF NOT EXISTS abandonment_point text,
  ADD COLUMN IF NOT EXISTS booking_session_id text,
  ADD COLUMN IF NOT EXISTS customer_reported_source text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribution_record_id uuid,
  ADD COLUMN IF NOT EXISTS first_touch_attribution_id uuid,
  ADD COLUMN IF NOT EXISTS last_touch_attribution_id uuid,
  ADD COLUMN IF NOT EXISTS original_customer_address text,
  ADD COLUMN IF NOT EXISTS normalized_address text,
  ADD COLUMN IF NOT EXISTS buzzer text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS apartment_status text,
  ADD COLUMN IF NOT EXISTS elevator boolean,
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS access_instructions text,
  ADD COLUMN IF NOT EXISTS geocoder_result jsonb,
  ADD COLUMN IF NOT EXISTS service_area_result jsonb,
  ADD COLUMN IF NOT EXISTS address_correction_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address_override_actor text,
  ADD COLUMN IF NOT EXISTS address_override_reason text,
  ADD COLUMN IF NOT EXISTS pricing_config_version text,
  ADD COLUMN IF NOT EXISTS price_accepted_at timestamptz;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS attribution_record_id uuid,
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS donation_request_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS service_request_id uuid,
  ADD COLUMN IF NOT EXISTS refund_request_id uuid,
  ADD COLUMN IF NOT EXISTS nearby_offer_id uuid REFERENCES nearby_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_action text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb;

ALTER TABLE phone_calls
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS donation_request_id uuid,
  ADD COLUMN IF NOT EXISTS service_request_id uuid,
  ADD COLUMN IF NOT EXISTS refund_request_id uuid,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS sentiment text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-photos', 'donation-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------- Marketing and attribution ----------
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL,
  source text NOT NULL,
  offer text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  creative text,
  neighbourhood text,
  distribution_zone text,
  distributor text,
  planned_quantity integer,
  actual_quantity integer,
  printing_cost_cents integer DEFAULT 0,
  distribution_cost_cents integer DEFAULT 0,
  distribution_date date,
  destination_page text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_tracking_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES campaign_batches(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  qr_code text,
  short_code text,
  promo_code text,
  destination_path text NOT NULL DEFAULT '/book',
  active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attribution_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  donation_request_id uuid,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id text,
  touch_type text NOT NULL CHECK (touch_type IN ('first','last','correction')),
  channel text,
  source text,
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES campaign_batches(id) ON DELETE SET NULL,
  creative text,
  neighbourhood text,
  distribution_zone text,
  distributor text,
  distribution_date date,
  tracking_code_id uuid REFERENCES campaign_tracking_codes(id) ON DELETE SET NULL,
  tracking_code text,
  qr_code text,
  promotion text,
  landing_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  fbclid text,
  customer_reported_source text,
  attribution_reason text,
  corrected_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  correction_reason text,
  first_visit_at timestamptz NOT NULL DEFAULT now(),
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  conversion_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM attribution_records
    WHERE touch_type = 'first'
    GROUP BY session_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create attribution_first_touch_once: duplicate first-touch attribution rows exist. Inspect and reconcile attribution_records by session_id before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attribution_first_touch_once
  ON attribution_records(session_id) WHERE touch_type = 'first';
CREATE INDEX IF NOT EXISTS attribution_session_idx ON attribution_records(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attribution_lead_idx ON attribution_records(lead_id);
CREATE INDEX IF NOT EXISTS attribution_booking_idx ON attribution_records(booking_id);
CREATE INDEX IF NOT EXISTS attribution_campaign_idx ON attribution_records(campaign_id, batch_id);

CREATE TABLE IF NOT EXISTS funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  donation_request_id uuid,
  attribution_record_id uuid REFERENCES attribution_records(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  step text,
  value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funnel_events_session_idx ON funnel_events(session_id, created_at DESC);

-- ---------- Quo SMS consent, context and expected replies ----------
CREATE TABLE IF NOT EXISTS sms_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  normalized_phone text NOT NULL UNIQUE,
  consent_source text,
  consent_at timestamptz,
  stop_at timestamptz,
  start_at timestamptz,
  current_eligibility boolean NOT NULL DEFAULT true,
  allowed_category text NOT NULL DEFAULT 'transactional',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_suppression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_phone text NOT NULL UNIQUE,
  reason text NOT NULL,
  suppressed_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  provider_payload jsonb
);

CREATE TABLE IF NOT EXISTS expected_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  normalized_phone text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  expected_intent text NOT NULL,
  valid_responses text[] NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','expired','cancelled')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_message_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS expected_replies_phone_idx ON expected_replies(normalized_phone, status, expires_at);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expected_replies
    WHERE status = 'active'
    GROUP BY entity_type, entity_id, expected_intent
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create expected_replies_active_entity_idx: duplicate active expected replies exist for the same entity and intent.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS expected_replies_active_entity_idx
  ON expected_replies(entity_type, entity_id, expected_intent)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS message_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  link_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, entity_type, entity_id)
);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM message_entity_links
    GROUP BY message_id, entity_type, entity_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create message_entity_links uniqueness: duplicate message/entity links exist.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS message_entity_links_unique_idx
  ON message_entity_links(message_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS message_entity_links_entity_idx ON message_entity_links(entity_type, entity_id);

-- ---------- Donation-only pickup ----------
CREATE TABLE IF NOT EXISTS donation_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT false,
  accepted_categories text[] DEFAULT '{}',
  prohibited_categories text[] DEFAULT '{}',
  minimum_condition text NOT NULL DEFAULT 'good',
  upholstered_furniture jsonb DEFAULT '{}'::jsonb,
  mattresses jsonb DEFAULT '{}'::jsonb,
  appliances jsonb DEFAULT '{}'::jsonb,
  electronics jsonb DEFAULT '{}'::jsonb,
  dimensions jsonb DEFAULT '{}'::jsonb,
  weight jsonb DEFAULT '{}'::jsonb,
  volume jsonb DEFAULT '{}'::jsonb,
  required_photos text[] NOT NULL DEFAULT ARRAY['full_item_view','condition_close_up','total_quantity_context'],
  approved_destinations jsonb DEFAULT '[]'::jsonb,
  destination_restrictions jsonb DEFAULT '{}'::jsonb,
  manual_review_threshold numeric NOT NULL DEFAULT 0.72,
  manager_exception_limits jsonb DEFAULT '{}'::jsonb,
  route_fit_limits jsonb DEFAULT '{}'::jsonb,
  on_site_rejection jsonb DEFAULT '{}'::jsonb,
  paid_conversion jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_ref text UNIQUE NOT NULL DEFAULT 'DR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  session_id text,
  name text,
  phone text NOT NULL,
  normalized_phone text,
  email text,
  address text,
  unit text,
  buzzer text,
  access_instructions text,
  lat double precision,
  lng double precision,
  postal_code text,
  quadrant text CHECK (quadrant IN ('NW','NE','SW','SE')),
  availability jsonb DEFAULT '{}'::jsonb,
  outside_pickup_permission boolean NOT NULL DEFAULT false,
  stairs integer DEFAULT 0,
  elevator boolean,
  parking text,
  description text,
  confirmation_photos_accurate boolean NOT NULL DEFAULT false,
  confirmation_items_clean boolean NOT NULL DEFAULT false,
  confirmation_items_usable boolean NOT NULL DEFAULT false,
  confirmation_no_garbage boolean NOT NULL DEFAULT false,
  confirmation_no_hazmat boolean NOT NULL DEFAULT false,
  attribution_record_id uuid REFERENCES attribution_records(id) ON DELETE SET NULL,
  first_touch_attribution_id uuid REFERENCES attribution_records(id) ON DELETE SET NULL,
  last_touch_attribution_id uuid REFERENCES attribution_records(id) ON DELETE SET NULL,
  sms_consent_source text,
  sms_consent_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','analyzing','needs_more_photos','ai_approved','manual_review',
    'rejected','paid_quote_offered','route_waiting','route_matched','pickup_window_offered',
    'customer_confirmed','assigned','en_route','picked_up','delivered_to_storage',
    'delivered_to_partner','rejected_on_site','converted_to_paid','cancelled','expired'
  )),
  status_reason text,
  resume_token_hash text,
  last_completed_step text,
  last_activity_at timestamptz,
  photos_started_at timestamptz,
  submitted_at timestamptz,
  policy_version_id uuid REFERENCES donation_policy_versions(id) ON DELETE SET NULL,
  ai_outcome text,
  confidence numeric,
  volume_cuft numeric,
  weight_kg numeric,
  destination_id uuid REFERENCES donation_centers(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  converted_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donation_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 1,
  condition text,
  dimensions jsonb DEFAULT '{}'::jsonb,
  weight_kg numeric,
  volume_cuft numeric,
  ai_decision text,
  rejection_reasons text[] DEFAULT '{}',
  destination text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donation_request_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  photo_type text NOT NULL,
  storage_url text NOT NULL,
  storage_path text,
  original_filename text,
  mime_type text,
  upload_order integer NOT NULL DEFAULT 0,
  file_size_bytes integer,
  width integer,
  height integer,
  sha256 text,
  perceptual_hash text,
  source_step text,
  processing_status text NOT NULL DEFAULT 'uploaded',
  processing_errors text,
  duplicate_result jsonb,
  removed_at timestamptz,
  replaced_by_photo_id uuid,
  admin_review_state text NOT NULL DEFAULT 'pending',
  retention_state text NOT NULL DEFAULT 'active',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donation_requests
  ADD COLUMN IF NOT EXISTS resume_token_hash text,
  ADD COLUMN IF NOT EXISTS last_completed_step text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS photos_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE donation_request_photos
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS mime_type text;

CREATE INDEX IF NOT EXISTS donation_requests_resume_token_hash_idx ON donation_requests(resume_token_hash);
CREATE INDEX IF NOT EXISTS donation_request_photos_request_idx ON donation_request_photos(donation_request_id, uploaded_at);

CREATE TABLE IF NOT EXISTS donation_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  donation_policy_version_id uuid REFERENCES donation_policy_versions(id) ON DELETE SET NULL,
  raw_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  structured_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  item_level_decisions jsonb DEFAULT '[]'::jsonb,
  rejection_reasons text[] DEFAULT '{}',
  manual_corrections jsonb DEFAULT '[]'::jsonb,
  correction_actor uuid REFERENCES employees(id) ON DELETE SET NULL,
  correction_reason text,
  processing_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donation_route_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_request_id uuid NOT NULL REFERENCES donation_requests(id) ON DELETE CASCADE,
  crew_assignment_id uuid REFERENCES crew_assignments(id) ON DELETE SET NULL,
  route_plan_id uuid REFERENCES route_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','approved','offered','accepted','rejected','expired')),
  detour_km numeric,
  added_driving_minutes integer,
  added_service_minutes integer,
  paid_customer_delay_minutes integer,
  capacity_impact jsonb DEFAULT '{}'::jsonb,
  route_fit_result jsonb DEFAULT '{}'::jsonb,
  offer_expires_at timestamptz,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Price ledger ----------
CREATE TABLE IF NOT EXISTS quote_price_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  donation_request_id uuid REFERENCES donation_requests(id) ON DELETE SET NULL,
  ledger_type text NOT NULL CHECK (ledger_type IN ('initial_quote','revised_quote','onsite_quote','final_charge','payment','refund','tip','discount','promotion','referral_credit')),
  pricing_config_version text,
  base_price integer DEFAULT 0,
  same_day_fee integer DEFAULT 0,
  stair_fee integer DEFAULT 0,
  freon_fee integer DEFAULT 0,
  travel_fee integer DEFAULT 0,
  travel_kilometres numeric DEFAULT 0,
  truck_size integer,
  truck_fee integer DEFAULT 0,
  surge numeric DEFAULT 1.0,
  dynamic_multiplier numeric DEFAULT 1.0,
  discount integer DEFAULT 0,
  promotion text,
  referral_credit integer DEFAULT 0,
  deposit integer DEFAULT 0,
  balance integer DEFAULT 0,
  total integer NOT NULL,
  cash integer DEFAULT 0,
  card integer DEFAULT 0,
  tip integer DEFAULT 0,
  refund integer DEFAULT 0,
  actor_type text NOT NULL,
  actor_id uuid,
  reason text NOT NULL,
  customer_notification_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM quote_price_ledger
    WHERE ledger_type = 'initial_quote' AND booking_id IS NOT NULL
    GROUP BY booking_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create quote_price_ledger_one_initial_booking: duplicate initial quotes exist for at least one booking.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS quote_price_ledger_one_initial_booking
  ON quote_price_ledger(booking_id) WHERE ledger_type = 'initial_quote';

-- ---------- Timeline and audit ----------
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_type text,
  actor_id uuid,
  source text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timeline_events_entity_idx ON timeline_events(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id uuid,
  source text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_type, actor_id, created_at DESC);

-- ---------- Staff roles and manager scopes ----------
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('owner','admin','manager','employee')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  owner_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_role_permissions (
  role_id uuid NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS staff_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS manager_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  scope_value text NOT NULL,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

INSERT INTO staff_roles (name, description) VALUES
  ('owner', 'Unrestricted owner role'),
  ('admin', 'Administrative operator'),
  ('manager', 'Scoped operations manager'),
  ('employee', 'Crew employee')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (key, description, owner_only) VALUES
  ('bookings.assign_crew', 'Assign crew to bookings', false),
  ('bookings.assign_truck', 'Assign truck or crew assignment', false),
  ('bookings.reschedule', 'Reschedule bookings', false),
  ('bookings.correct_address', 'Correct customer address', false),
  ('bookings.review_quote', 'Review and adjust quote', false),
  ('bookings.cancel', 'Cancel booking', false),
  ('communications.send_approved_sms', 'Send approved Quo messages', false),
  ('donations.review', 'Review donation requests', false),
  ('donations.route_match', 'Approve donation route fit', false),
  ('refunds.issue', 'Issue customer refunds', true),
  ('payroll.approve', 'Approve payroll', true),
  ('payroll.send', 'Send payroll', true),
  ('payroll.change_rates', 'Change pay rates', true),
  ('employees.terminate', 'Terminate employees', true),
  ('evidence.delete', 'Delete customer/crew evidence', true),
  ('audit.delete', 'Delete audit logs', true),
  ('hours.approve_own', 'Approve own hours', true),
  ('safety.override', 'Override safety rules', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r CROSS JOIN permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r JOIN permissions p ON p.owner_only = false
WHERE r.name IN ('admin','manager')
ON CONFLICT DO NOTHING;

-- ---------- Missing customer-support tables currently referenced by routes ----------
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  normalized_phone text,
  email text,
  booking_ref text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  normalized_phone text,
  email text,
  booking_ref text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  reason text NOT NULL,
  amount_requested numeric,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  outcome text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE refund_requests
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS amount_requested numeric,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text NOT NULL,
  caller_phone text,
  booking_ref text,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS caller_phone text,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS compensation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text,
  compensation_type text NOT NULL,
  reason text,
  caller_phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compensation_log
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS compensation_type text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS caller_phone text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
DECLARE
  mismatch text;
BEGIN
  SELECT string_agg(table_name || '.' || column_name || ' is ' || data_type || ', expected ' || expected_type, '; ')
  INTO mismatch
  FROM (
    VALUES
      ('service_requests','id','uuid'),
      ('service_requests','booking_id','uuid'),
      ('service_requests','assigned_to','uuid'),
      ('refund_requests','id','uuid'),
      ('refund_requests','booking_id','uuid'),
      ('refund_requests','reviewed_by','uuid'),
      ('escalations','id','uuid'),
      ('compensation_log','id','uuid')
  ) AS expected(table_name, column_name, expected_type)
  JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = expected.table_name
   AND c.column_name = expected.column_name
  WHERE c.data_type <> expected.expected_type;

  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Foundation migration blocked by incompatible existing support-table column types: %', mismatch;
  END IF;
END $$;

-- ---------- RLS ----------
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tracking_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_route_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_price_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'marketing_campaigns','campaign_batches','campaign_tracking_codes','attribution_records','funnel_events',
    'sms_consent','sms_suppression','expected_replies','message_entity_links','donation_policy_versions',
    'donation_requests','donation_request_items','donation_request_photos','donation_ai_analyses',
    'donation_route_matches','quote_price_ledger','timeline_events','audit_events','staff_roles',
    'permissions','staff_role_permissions','staff_role_assignments','manager_scopes','service_requests',
    'refund_requests','escalations','compensation_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', t);
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', t);
  END LOOP;
END $$;

-- FK constraints added after referenced tables exist.
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_donation_request_id_fkey,
  ADD CONSTRAINT messages_donation_request_id_fkey FOREIGN KEY (donation_request_id) REFERENCES donation_requests(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS messages_campaign_id_fkey,
  ADD CONSTRAINT messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS messages_service_request_id_fkey,
  ADD CONSTRAINT messages_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS messages_refund_request_id_fkey,
  ADD CONSTRAINT messages_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES refund_requests(id) ON DELETE SET NULL;

ALTER TABLE phone_calls
  DROP CONSTRAINT IF EXISTS phone_calls_donation_request_id_fkey,
  ADD CONSTRAINT phone_calls_donation_request_id_fkey FOREIGN KEY (donation_request_id) REFERENCES donation_requests(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS phone_calls_service_request_id_fkey,
  ADD CONSTRAINT phone_calls_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS phone_calls_refund_request_id_fkey,
  ADD CONSTRAINT phone_calls_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES refund_requests(id) ON DELETE SET NULL;

ALTER TABLE attribution_records
  DROP CONSTRAINT IF EXISTS attribution_records_donation_request_id_fkey,
  ADD CONSTRAINT attribution_records_donation_request_id_fkey FOREIGN KEY (donation_request_id) REFERENCES donation_requests(id) ON DELETE SET NULL;

ALTER TABLE funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_donation_request_id_fkey,
  ADD CONSTRAINT funnel_events_donation_request_id_fkey FOREIGN KEY (donation_request_id) REFERENCES donation_requests(id) ON DELETE SET NULL;

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_attribution_record_id_fkey,
  ADD CONSTRAINT leads_attribution_record_id_fkey FOREIGN KEY (attribution_record_id) REFERENCES attribution_records(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS leads_first_touch_attribution_id_fkey,
  ADD CONSTRAINT leads_first_touch_attribution_id_fkey FOREIGN KEY (first_touch_attribution_id) REFERENCES attribution_records(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS leads_last_touch_attribution_id_fkey,
  ADD CONSTRAINT leads_last_touch_attribution_id_fkey FOREIGN KEY (last_touch_attribution_id) REFERENCES attribution_records(id) ON DELETE SET NULL;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_attribution_record_id_fkey,
  ADD CONSTRAINT bookings_attribution_record_id_fkey FOREIGN KEY (attribution_record_id) REFERENCES attribution_records(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS bookings_first_touch_attribution_id_fkey,
  ADD CONSTRAINT bookings_first_touch_attribution_id_fkey FOREIGN KEY (first_touch_attribution_id) REFERENCES attribution_records(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS bookings_last_touch_attribution_id_fkey,
  ADD CONSTRAINT bookings_last_touch_attribution_id_fkey FOREIGN KEY (last_touch_attribution_id) REFERENCES attribution_records(id) ON DELETE SET NULL;

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS service_requests_booking_id_fkey,
  ADD CONSTRAINT service_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS service_requests_assigned_to_fkey,
  ADD CONSTRAINT service_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_booking_id_fkey,
  ADD CONSTRAINT refund_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS refund_requests_reviewed_by_fkey,
  ADD CONSTRAINT refund_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL;

INSERT INTO donation_policy_versions (
  version, active, accepted_categories, prohibited_categories, minimum_condition, required_photos, route_fit_limits
) VALUES (
  '2026-07-default',
  true,
  ARRAY['furniture','housewares','working_electronics','small_appliances','clean_baby_items'],
  ARRAY['garbage','food_waste','construction_debris','hazardous_material','mold','pest_evidence','broken_appliances'],
  'clean_usable',
  ARRAY['full_item_view','condition_close_up','damage_photo','total_quantity_context'],
  '{"max_detour_km":8,"max_driving_minutes":15,"max_service_minutes":20,"max_paid_customer_delay_minutes":10,"max_volume_cuft":120,"max_weight_kg":90,"minimum_remaining_capacity_pct":25,"offer_expiry_hours":4}'::jsonb
) ON CONFLICT (version) DO NOTHING;
