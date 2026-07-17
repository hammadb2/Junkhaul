import { supabaseAdmin } from './supabase';
export { OWNER_ONLY_PERMISSIONS, roleAllows } from './permissionRules';
import { roleAllows } from './permissionRules';

export async function getStaffRoles(employeeId) {
  if (!employeeId) return [];
  const { data } = await supabaseAdmin
    .from('staff_role_assignments')
    .select('role:staff_roles(name)')
    .eq('employee_id', employeeId)
    .is('revoked_at', null);
  return (data || []).map((r) => r.role?.name).filter(Boolean);
}

export async function getStaffPermissions(employeeId) {
  if (!employeeId) return [];
  const roles = await getStaffRoles(employeeId);
  if (roles.includes('owner')) return ['*'];
  if (roles.length === 0) return [];

  const { data } = await supabaseAdmin
    .from('staff_role_assignments')
    .select('role:staff_roles(staff_role_permissions(permission:permissions(key, owner_only)))')
    .eq('employee_id', employeeId)
    .is('revoked_at', null);

  const keys = new Set();
  for (const assignment of data || []) {
    for (const grant of assignment.role?.staff_role_permissions || []) {
      const permission = grant.permission;
      if (permission?.key && !permission.owner_only) keys.add(permission.key);
    }
  }
  return [...keys];
}

export async function requirePermission({ employeeId, permission }) {
  const roles = await getStaffRoles(employeeId);
  const permissions = await getStaffPermissions(employeeId);
  if (permissions.includes('*') || permissions.includes(permission) || roles.some((role) => roleAllows(role, permission))) {
    return { ok: true, roles, permissions };
  }
  return { ok: false, roles, permissions, error: 'Forbidden' };
}
