-- Operational admin permission keys and grants.
-- Forward-only: do not edit earlier applied migrations to add permission seeds.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS flag_for_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_status_operational_check,
  ADD CONSTRAINT leads_status_operational_check
    CHECK (status IS NULL OR status IN ('open','quoted','engaged','converted','invalid','spam','merged'));

CREATE INDEX IF NOT EXISTS leads_status_operational_idx ON leads(status, last_activity_at DESC);

ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS planned_budget_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_page text;

ALTER TABLE campaign_tracking_codes
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivation_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS campaign_tracking_codes_active_idx ON campaign_tracking_codes(active, starts_at, ends_at);

INSERT INTO permissions (key, description, owner_only) VALUES
  ('admin.read', 'Read operational admin dashboards', false),
  ('billing.manage', 'Change Stripe or billing credentials/configuration', true),
  ('config.read', 'Read runtime system configuration', false),
  ('config.manage_sensitive', 'Change sensitive pricing, payroll, tax, billing, or operational configuration', true),
  ('employees.read', 'Read employee roster and basic employment status', false),
  ('employees.create', 'Create or invite employees', false),
  ('employees.update', 'Update basic employee profile fields', false),
  ('employees.read_compensation', 'Read employee compensation fields', true),
  ('employees.change_pay_rate', 'Change employee pay rates', true),
  ('employees.read_banking', 'View full employee banking details', true),
  ('employees.read_sin', 'View full employee SIN/tax identity details', true),
  ('employees.assign_owner_role', 'Assign owner staff role', true),
  ('employees.assign_admin_role', 'Assign admin staff role', true),
  ('permissions.assign', 'Assign non-owner-only staff permissions', false),
  ('permissions.assign_owner_only', 'Assign owner-only staff permissions', true),
  ('manager_scopes.assign', 'Assign manager scopes', false),
  ('employee_documents.read', 'Read non-sensitive employee document metadata', false),
  ('employee_documents.read_sensitive', 'Read sensitive employee documents such as banking/SIN/government ID', true),
  ('employee_documents.verify', 'Verify or reject employee documents', false),
  ('payroll.preview', 'Preview payroll calculations', true),
  ('payroll.generate', 'Generate payroll runs', true),
  ('compensation.adjust', 'Create compensation adjustments', true),
  ('bookings.assign', 'Assign or unassign crews and trucks on bookings', false),
  ('bookings.notes', 'Add internal booking notes', false),
  ('bookings.escalate', 'Escalate or flag booking issues', false),
  ('leads.manage', 'Manage lead detail actions', false),
  ('campaigns.manage', 'Create and manage campaigns, batches, and tracking codes', false),
  ('communications.retry', 'Retry safe failed customer communications', false)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner_only = EXCLUDED.owner_only;

-- Owner receives every permission.
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
CROSS JOIN permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

-- Admin receives non-owner-only operational permissions.
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.owner_only = false
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager receives scoped operational permissions only.
INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.key IN (
  'admin.read',
  'bookings.assign',
  'bookings.assign_crew',
  'bookings.assign_truck',
  'bookings.reschedule',
  'bookings.correct_address',
  'bookings.cancel',
  'bookings.notes',
  'bookings.escalate',
  'communications.send_approved_sms',
  'communications.retry',
  'donations.review',
  'employee_documents.verify',
  'employees.read',
  'leads.manage'
)
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Employee role intentionally receives no admin permissions here.
