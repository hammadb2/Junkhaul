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

export async function requirePermission({ employeeId, permission }) {
  const roles = await getStaffRoles(employeeId);
  if (roles.some((role) => roleAllows(role, permission))) return { ok: true, roles };
  return { ok: false, roles, error: 'Forbidden' };
}
