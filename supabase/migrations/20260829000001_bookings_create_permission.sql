-- ============================================================
-- Add the bookings.create permission (audit finding A1).
--
-- POST /api/admin/bookings (manual/phone booking entry from the Dispatch
-- "New Booking" modal) previously didn't exist at all — the route only had
-- a GET handler, so every attempt 405'd. Adding the POST handler in the
-- same change as this migration; without this grant, only the owner (who
-- always receives every permission via getStaffPermissions' '*') could use
-- it, and every admin/manager would get 403 Forbidden.
--
-- Scope mirrors bookings.reschedule exactly (owner, admin, manager) — the
-- closest existing "staff modifies a booking" permission, same reviewers.
-- ============================================================

INSERT INTO permissions (key, description, owner_only) VALUES
  ('bookings.create', 'Create a booking manually (phone/walk-in entry via the admin dispatch panel)', false)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner_only = EXCLUDED.owner_only;

INSERT INTO staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM staff_roles r CROSS JOIN permissions p
WHERE r.name IN ('owner', 'admin', 'manager') AND p.key = 'bookings.create'
ON CONFLICT DO NOTHING;
