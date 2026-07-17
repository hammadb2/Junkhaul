export const OWNER_ONLY_PERMISSIONS = new Set([
  'billing.manage',
  'config.manage_sensitive',
  'employee_documents.read_sensitive',
  'employees.assign_admin_role',
  'employees.assign_owner_role',
  'employees.change_pay_rate',
  'employees.read_banking',
  'employees.read_sin',
  'refunds.issue',
  'payroll.approve',
  'payroll.generate',
  'payroll.send',
  'payroll.change_rates',
  'permissions.assign_owner_only',
  'staff_access.manage',
  'employees.terminate',
  'compensation.adjust',
  'evidence.delete',
  'audit.delete',
  'hours.approve_own',
  'safety.override',
]);

export function roleAllows(role, permission) {
  if (role === 'owner') return true;
  if (role === 'manager' && OWNER_ONLY_PERMISSIONS.has(permission)) return false;
  if (role === 'admin' && OWNER_ONLY_PERMISSIONS.has(permission)) return false;
  if (role === 'employee') return false;
  return ['admin', 'manager'].includes(role);
}
