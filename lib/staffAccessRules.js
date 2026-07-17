export const MANAGER_MANAGEMENT_PERMISSION = 'staff_access.manage_managers';

export const MANAGER_MANAGEMENT_ACTIONS = new Set([
  'create_manager',
  'assign_role',
  'remove_role',
  'assign_scope',
  'remove_scope',
  'change_scope',
  'disable_access',
  'reactivate_access',
  'reset_manager_password',
]);

export function isOwnerContext(context = {}) {
  return Array.isArray(context.roles) && context.roles.includes('owner');
}

export function hasManagerManagementPermission(context = {}) {
  return Array.isArray(context.permissions) && (
    context.permissions.includes('*') || context.permissions.includes(MANAGER_MANAGEMENT_PERMISSION)
  );
}

export function isAdminManagerAction(action) {
  return MANAGER_MANAGEMENT_ACTIONS.has(action);
}

export function canAdminManageManagerAction({
  context,
  action,
  targetRoles = [],
  targetEmployeeId = null,
  role = null,
  permission = null,
  isFinalOwner = false,
} = {}) {
  if (isOwnerContext(context)) return { ok: true };
  if (!hasManagerManagementPermission(context)) return { ok: false, status: 403, error: 'Forbidden' };
  if (!isAdminManagerAction(action)) return { ok: false, status: 403, error: 'Admins can only manage manager accounts and manager scopes.' };
  if (targetEmployeeId && targetEmployeeId === context?.employee?.id) return { ok: false, status: 409, error: 'You cannot change your own access.' };
  if (isFinalOwner) return { ok: false, status: 409, error: 'Cannot remove the final active owner.' };
  if (permission) return { ok: false, status: 403, error: 'Admins cannot grant direct permissions from Staff Access.' };

  const targetIsOwner = targetRoles.includes('owner');
  const targetIsAdmin = targetRoles.includes('admin');
  if (targetIsOwner || targetIsAdmin) {
    return { ok: false, status: 403, error: 'Admins cannot modify owner or admin accounts.' };
  }

  if ((action === 'assign_role' || action === 'remove_role') && role !== 'manager') {
    return { ok: false, status: 403, error: 'Admins can only assign or remove the manager role.' };
  }

  return { ok: true };
}
