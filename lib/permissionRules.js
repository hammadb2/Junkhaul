export const OWNER_ONLY_PERMISSIONS = new Set([
  'refunds.issue',
  'payroll.approve',
  'payroll.send',
  'payroll.change_rates',
  'employees.terminate',
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
