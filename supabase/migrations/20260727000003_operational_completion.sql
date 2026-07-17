-- Operational completion permissions and manager-scope reconciliation.
-- Forward-only migration: do not edit already-applied historical migrations.

ALTER TABLE manager_scopes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS effect text NOT NULL DEFAULT 'allow',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS schedule_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS merged_into_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_lead_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE manager_scopes
  DROP CONSTRAINT IF EXISTS manager_scopes_effect_check,
  ADD CONSTRAINT manager_scopes_effect_check CHECK (effect IN ('allow','deny'));

CREATE INDEX IF NOT EXISTS manager_scopes_active_lookup_idx
  ON manager_scopes(employee_id, scope_type, scope_value, effect, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS staff_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  reason text
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_user_permissions_one_active
  ON staff_user_permissions(employee_id, permission_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS staff_user_permissions_employee_idx
  ON staff_user_permissions(employee_id, revoked_at);

CREATE TABLE IF NOT EXISTS manager_daily_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_date date NOT NULL,
  manager_employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reopened')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operation_date, manager_employee_id)
);

ALTER TABLE manager_daily_closeouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON manager_daily_closeouts;
CREATE POLICY "Service role full access"
  ON manager_daily_closeouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE staff_user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON staff_user_permissions;
CREATE POLICY "Service role full access"
  ON staff_user_permissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO permissions (key, description, owner_only) VALUES
  ('staff_access.manage', 'Manage staff roles, permissions and manager scopes', true),
  ('audit.read', 'Read redacted operational audit events', false),
  ('reports.read', 'Read operational and marketing reports', false),
  ('schedule.manage', 'Create, update, and remove customer booking slots', false),
  ('media.view', 'View protected customer and job media', false),
  ('media.upload', 'Upload operational job evidence', false),
  ('crew.assignments.manage', 'Manage crew assignments and dispatch push notifications', false),
  ('storage.manage', 'Manage storage drops and storage inventory', false),
  ('donation_centers.manage', 'Manage donation center records', false),
  ('incidents.manage', 'Review and update operational safety incidents', false),
  ('agent.use', 'Use admin AI agent actions', false),
  ('waitlist.manage', 'Manage waitlist offers and customer follow-up', false),
  ('bookings.complete', 'Mark jobs arrived, no-show, or completed', false),
  ('bookings.photos', 'Request or upload booking photos', false),
  ('manager.closeout', 'Save manager daily closeout checklist', false)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner_only = EXCLUDED.owner_only;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
CROSS JOIN permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.key IN (
  'admin.read',
  'audit.read',
  'reports.read',
  'schedule.manage',
  'media.view',
  'media.upload',
  'crew.assignments.manage',
  'storage.manage',
  'donation_centers.manage',
  'incidents.manage',
  'agent.use',
  'waitlist.manage',
  'bookings.complete',
  'bookings.photos',
  'manager.closeout',
  'bookings.assign',
  'bookings.assign_crew',
  'bookings.assign_truck',
  'bookings.reschedule',
  'bookings.correct_address',
  'bookings.cancel',
  'bookings.notes',
  'bookings.escalate',
  'leads.manage',
  'campaigns.manage',
  'communications.send_approved_sms',
  'communications.retry',
  'donations.review',
  'employees.read',
  'employee_documents.verify'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.key IN (
  'admin.read',
  'audit.read',
  'reports.read',
  'schedule.manage',
  'media.view',
  'media.upload',
  'crew.assignments.manage',
  'storage.manage',
  'donation_centers.manage',
  'incidents.manage',
  'waitlist.manage',
  'bookings.complete',
  'bookings.photos',
  'manager.closeout',
  'bookings.assign',
  'bookings.assign_crew',
  'bookings.assign_truck',
  'bookings.reschedule',
  'bookings.correct_address',
  'bookings.cancel',
  'bookings.notes',
  'bookings.escalate',
  'leads.manage',
  'communications.send_approved_sms',
  'communications.retry',
  'donations.review',
  'employees.read',
  'employee_documents.verify'
)
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;
