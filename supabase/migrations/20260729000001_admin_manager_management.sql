-- Admin manager-management permission.
-- Forward-only migration: do not edit already-applied historical migrations.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS employees_reset_token_idx
  ON employees(reset_token)
  WHERE reset_token IS NOT NULL;

INSERT INTO permissions (key, description, owner_only)
VALUES (
  'staff_access.manage_managers',
  'Create and manage manager accounts, manager roles and manager scopes',
  false
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner_only = EXCLUDED.owner_only;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r
JOIN permissions p ON p.key = 'staff_access.manage_managers'
WHERE r.name IN ('owner', 'admin')
ON CONFLICT DO NOTHING;
