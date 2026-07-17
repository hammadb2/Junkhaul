import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { recordAuditEvent } from '@/lib/auditEvents';
import { getStaffContext, hasPermission, jsonForbidden, jsonUnauthorized } from '@/lib/staffAuth';
import { hashPassword } from '@/lib/employeeAuth';
import { canAdminManageManagerAction, hasManagerManagementPermission, isOwnerContext, MANAGER_MANAGEMENT_PERMISSION } from '@/lib/staffAccessRules';

export const runtime = 'nodejs';

const ROLE_NAMES = new Set(['owner', 'admin', 'manager', 'employee']);
const SCOPE_TYPES = new Set(['booking', 'date', 'quadrant', 'crew_assignment', 'crew', 'employee', 'truck', 'shift', 'route_plan', 'daily_operation']);

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] || null, last_name: parts.slice(1).join(' ') || null };
}

function safeEmployee(row) {
  if (!row) return row;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    status: row.status,
    last_login_at: row.last_login_at || null,
  };
}

async function getAccessSnapshot(employeeId) {
  const [{ data: assignments }, { data: scopes }, { data: directPermissions }] = await Promise.all([
    supabaseAdmin
      .from('staff_role_assignments')
      .select('id, assigned_at, revoked_at, role:staff_roles(id,name)')
      .eq('employee_id', employeeId)
      .is('revoked_at', null),
    supabaseAdmin
      .from('manager_scopes')
      .select('*')
      .eq('employee_id', employeeId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('staff_user_permissions')
      .select('id, granted_at, reason, permission:permissions(id,key,owner_only)')
      .eq('employee_id', employeeId)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false }),
  ]);
  return {
    roles: (assignments || []).map((a) => ({ assignment_id: a.id, role_id: a.role?.id, name: a.role?.name, assigned_at: a.assigned_at })),
    direct_permissions: (directPermissions || []).map((p) => ({ grant_id: p.id, permission_id: p.permission?.id, key: p.permission?.key, owner_only: p.permission?.owner_only, granted_at: p.granted_at, reason: p.reason })),
    scopes: scopes || [],
  };
}

async function getActiveRoleNames(employeeId) {
  if (!employeeId) return [];
  const { data } = await supabaseAdmin
    .from('staff_role_assignments')
    .select('role:staff_roles(name)')
    .eq('employee_id', employeeId)
    .is('revoked_at', null);
  return (data || []).map((row) => row.role?.name).filter(Boolean);
}

async function isFinalOwnerTarget(employeeId, role) {
  if (role !== 'owner') return false;
  const { count } = await supabaseAdmin
    .from('staff_role_assignments')
    .select('id, role:staff_roles!inner(name)', { count: 'exact', head: true })
    .eq('role.name', 'owner')
    .is('revoked_at', null)
    .neq('employee_id', employeeId);
  return !count;
}

async function getStaffAccessAuth(req, { action = 'staff_access.read', employeeId = null, role = null, permissionKey = null } = {}) {
  const context = await getStaffContext(req);
  if (!context) return { ok: false, response: jsonUnauthorized(), context: null };
  const ownerAllowed = hasPermission(context, 'staff_access.manage', { ownerOnly: true });
  const managerAdminAllowed = hasManagerManagementPermission(context);
  if (!ownerAllowed && !managerAdminAllowed) {
    return { ok: false, response: jsonForbidden(), context };
  }
  if (ownerAllowed) return { ok: true, context, ownerAllowed: true, managerAdminAllowed };

  const targetRoles = employeeId ? await getActiveRoleNames(employeeId) : [];
  const permission = permissionKey ? { key: permissionKey } : null;
  const allowed = canAdminManageManagerAction({
    context,
    action,
    targetRoles,
    targetEmployeeId: employeeId,
    role,
    permission,
    isFinalOwner: await isFinalOwnerTarget(employeeId, role),
  });
  if (!allowed.ok) {
    return { ok: false, response: NextResponse.json({ error: allowed.error }, { status: allowed.status }), context };
  }
  return { ok: true, context, ownerAllowed: false, managerAdminAllowed: true };
}

async function enrichLastLogin(employees) {
  const ids = (employees || []).map((employee) => employee.id);
  if (!ids.length) return employees || [];
  const { data: sessions } = await supabaseAdmin
    .from('employee_sessions')
    .select('employee_id,last_seen_at,created_at')
    .in('employee_id', ids)
    .order('last_seen_at', { ascending: false });
  const latest = new Map();
  for (const session of sessions || []) {
    const value = session.last_seen_at || session.created_at || null;
    if (value && !latest.has(session.employee_id)) latest.set(session.employee_id, value);
  }
  return (employees || []).map((employee) => ({ ...employee, last_login_at: latest.get(employee.id) || null }));
}

async function auditAccess({ context, targetId, action, before, after, reason, metadata = {}, correlationId }) {
  await recordAuditEvent({
    entity_type: 'staff_access',
    entity_id: targetId,
    event_type: action,
    actor_type: 'employee',
    actor_id: context.employee.id,
    source: 'admin_staff_access',
    before,
    after,
    reason,
    metadata,
    correlation_id: correlationId,
  });
}

async function ensureNotFinalOwner(targetEmployeeId, removingRoleName) {
  if (removingRoleName !== 'owner') return;
  const { count } = await supabaseAdmin
    .from('staff_role_assignments')
    .select('id, role:staff_roles!inner(name)', { count: 'exact', head: true })
    .eq('role.name', 'owner')
    .is('revoked_at', null)
    .neq('employee_id', targetEmployeeId);
  if (!count) throw new Error('Cannot remove the final active owner.');
}

export async function GET(req) {
  const auth = await getStaffAccessAuth(req, { action: 'staff_access.read' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const isOwner = isOwnerContext(auth.context);
  const [{ data: employees }, { data: roles }, { data: permissions }, { data: rolePermissions }, { data: audit }] = await Promise.all([
    employeeId
      ? supabaseAdmin.from('employees').select('id, email, name, first_name, last_name, phone, status').eq('id', employeeId)
      : supabaseAdmin.from('employees').select('id, email, name, first_name, last_name, phone, status').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('staff_roles').select('*').order('name'),
    supabaseAdmin.from('permissions').select('*').order('key'),
    supabaseAdmin.from('staff_role_permissions').select('role_id, permission:permissions(id,key,owner_only), role:staff_roles(id,name)'),
    supabaseAdmin.from('audit_events').select('*').eq('entity_type', 'staff_access').order('created_at', { ascending: false }).limit(100),
  ]);

  const employeesWithLogin = await enrichLastLogin(employees || []);
  const snapshots = {};
  for (const employee of employeesWithLogin) snapshots[employee.id] = await getAccessSnapshot(employee.id);
  const visible = isOwner ? employeesWithLogin : employeesWithLogin.filter((employee) => {
    const activeRoles = snapshots[employee.id]?.roles?.map((role) => role.name) || [];
    return employee.id === auth.context.employee.id || activeRoles.includes('manager') || (!activeRoles.includes('owner') && !activeRoles.includes('admin'));
  });
  const visibleIds = new Set(visible.map((employee) => employee.id));
  const visibleSnapshots = Object.fromEntries(Object.entries(snapshots).filter(([id]) => visibleIds.has(id)));
  const visibleAudit = isOwner ? (audit || []) : (audit || []).filter((event) => visibleIds.has(event.entity_id));
  return NextResponse.json({
    employees: visible.map(safeEmployee),
    roles: isOwner ? (roles || []) : (roles || []).filter((role) => role.name === 'manager'),
    permissions: isOwner ? (permissions || []) : (permissions || []).filter((permission) => permission.key === MANAGER_MANAGEMENT_PERMISSION),
    role_permissions: isOwner ? (rolePermissions || []) : [],
    access: visibleSnapshots,
    audit: visibleAudit,
    capabilities: { owner: isOwner, manage_managers: hasManagerManagementPermission(auth.context) },
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { action, employee_id, role, permission_key, scope_type, scope_value, effect = 'allow', expires_at = null, priority = 0, reason = null } = body;
  const auth = await getStaffAccessAuth(req, { action, employeeId: employee_id || null, role, permissionKey: permission_key || null });
  if (!auth.ok) return auth.response;
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 422 });
  if (action !== 'create_manager' && !employee_id) return NextResponse.json({ error: 'employee_id required' }, { status: 422 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
  if (employee_id === auth.context.employee.id && ['assign_role', 'remove_role', 'assign_permission', 'remove_permission', 'disable_access'].includes(action)) {
    return NextResponse.json({ error: 'You cannot change your own access.' }, { status: 409 });
  }

  let targetEmployeeId = employee_id || null;
  const before = targetEmployeeId ? await getAccessSnapshot(targetEmployeeId) : null;
  const correlationId = randomUUID();
  let result = {};

  if (action === 'create_manager') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const temporaryPassword = String(body.temporary_password || body.password || '');
    if (!name || !email || !temporaryPassword) return NextResponse.json({ error: 'name, email and temporary_password are required' }, { status: 422 });
    const { data: existing } = await supabaseAdmin.from('employees').select('id,email').eq('email', email).maybeSingle();
    if (existing) return NextResponse.json({ error: 'An employee with that email already exists.' }, { status: 409 });
    const nameParts = splitName(name);
    const { data: employee, error } = await supabaseAdmin.from('employees').insert({
      email,
      password_hash: hashPassword(temporaryPassword),
      name,
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      phone: body.phone || null,
      status: 'active',
      hire_date: new Date().toISOString().slice(0, 10),
    }).select('id,email,name,first_name,last_name,phone,status').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    targetEmployeeId = employee.id;
    const { data: roleRow } = await supabaseAdmin.from('staff_roles').select('id,name').eq('name', 'manager').single();
    await supabaseAdmin.from('staff_role_assignments').insert({ employee_id: targetEmployeeId, role_id: roleRow.id, assigned_by: auth.context.employee.id }).throwOnError();
    result.employee = safeEmployee(employee);
    result.role = 'manager';
  } else if (action === 'assign_role') {
    if (!ROLE_NAMES.has(role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 422 });
    const { data: roleRow } = await supabaseAdmin.from('staff_roles').select('id,name').eq('name', role).single();
    const { data: existing } = await supabaseAdmin.from('staff_role_assignments').select('id').eq('employee_id', targetEmployeeId).eq('role_id', roleRow.id).is('revoked_at', null).maybeSingle();
    if (!existing) await supabaseAdmin.from('staff_role_assignments').insert({ employee_id: targetEmployeeId, role_id: roleRow.id, assigned_by: auth.context.employee.id }).throwOnError();
    result.role = role;
  } else if (action === 'remove_role') {
    if (!ROLE_NAMES.has(role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 422 });
    await ensureNotFinalOwner(targetEmployeeId, role);
    const { data: roleRow } = await supabaseAdmin.from('staff_roles').select('id,name').eq('name', role).single();
    await supabaseAdmin.from('staff_role_assignments').update({ revoked_at: new Date().toISOString() }).eq('employee_id', targetEmployeeId).eq('role_id', roleRow.id).is('revoked_at', null);
    result.role = role;
  } else if (action === 'assign_permission' || action === 'remove_permission') {
    if (!auth.ownerAllowed) return NextResponse.json({ error: 'Admins cannot grant direct permissions from Staff Access.' }, { status: 403 });
    if (!permission_key) return NextResponse.json({ error: 'permission_key required' }, { status: 422 });
    const { data: permission } = await supabaseAdmin.from('permissions').select('*').eq('key', permission_key).maybeSingle();
    if (!permission) return NextResponse.json({ error: 'Unknown permission key.' }, { status: 422 });
    if (permission.owner_only && action !== 'remove_permission') return NextResponse.json({ error: 'Owner-only permissions are granted through owner role assignment only.' }, { status: 409 });
    if (action === 'assign_permission') {
      await supabaseAdmin.from('staff_user_permissions').insert({
        employee_id: targetEmployeeId,
        permission_id: permission.id,
        granted_by: auth.context.employee.id,
        reason,
      }).throwOnError();
    } else {
      await supabaseAdmin.from('staff_user_permissions').update({
        revoked_at: new Date().toISOString(),
        revoked_by: auth.context.employee.id,
      }).eq('employee_id', targetEmployeeId).eq('permission_id', permission.id).is('revoked_at', null);
    }
    result.permission_key = permission_key;
  } else if (action === 'assign_scope') {
    if (!SCOPE_TYPES.has(scope_type) || !scope_value) return NextResponse.json({ error: 'valid scope_type and scope_value required' }, { status: 422 });
    if (!['allow', 'deny'].includes(effect)) return NextResponse.json({ error: 'effect must be allow or deny' }, { status: 422 });
    const { data: scope } = await supabaseAdmin.from('manager_scopes').insert({
      employee_id: targetEmployeeId,
      scope_type,
      scope_value: String(scope_value),
      effect,
      expires_at,
      priority,
      reason,
      created_by: auth.context.employee.id,
    }).select().single();
    result.scope = scope;
  } else if (action === 'change_scope') {
    if (!body.scope_id) return NextResponse.json({ error: 'scope_id required' }, { status: 422 });
    const update = {
      scope_type,
      scope_value: String(scope_value),
      effect,
      expires_at,
      priority,
      reason,
    };
    if (!SCOPE_TYPES.has(update.scope_type) || !update.scope_value) return NextResponse.json({ error: 'valid scope_type and scope_value required' }, { status: 422 });
    if (!['allow', 'deny'].includes(update.effect)) return NextResponse.json({ error: 'effect must be allow or deny' }, { status: 422 });
    const { data: scope } = await supabaseAdmin.from('manager_scopes').update(update).eq('id', body.scope_id).eq('employee_id', targetEmployeeId).select().single();
    result.scope = scope;
  } else if (action === 'remove_scope') {
    if (!body.scope_id) return NextResponse.json({ error: 'scope_id required' }, { status: 422 });
    await supabaseAdmin.from('manager_scopes').update({ revoked_at: new Date().toISOString() }).eq('id', body.scope_id).eq('employee_id', targetEmployeeId);
    result.scope_id = body.scope_id;
  } else if (action === 'disable_access') {
    await Promise.all([
      supabaseAdmin.from('employees').update({ status: 'terminated', updated_at: new Date().toISOString() }).eq('id', targetEmployeeId),
      supabaseAdmin.from('employee_sessions').delete().eq('employee_id', targetEmployeeId),
    ]);
    result.status = 'terminated';
  } else if (action === 'reactivate_access') {
    await supabaseAdmin.from('employees').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', targetEmployeeId);
    result.status = 'active';
  } else if (action === 'reset_manager_password') {
    const temporaryPassword = String(body.temporary_password || body.password || '');
    if (!temporaryPassword) return NextResponse.json({ error: 'temporary_password is required' }, { status: 422 });
    await Promise.all([
      supabaseAdmin.from('employees').update({ password_hash: hashPassword(temporaryPassword), updated_at: new Date().toISOString() }).eq('id', targetEmployeeId),
      supabaseAdmin.from('employee_sessions').delete().eq('employee_id', targetEmployeeId),
    ]);
    result.password_reset = true;
  } else {
    return NextResponse.json({ error: 'Unsupported staff access action.' }, { status: 422 });
  }

  const after = await getAccessSnapshot(targetEmployeeId);
  await auditAccess({ context: auth.context, targetId: targetEmployeeId, action: `staff_access.${action}`, before, after, reason, metadata: { role, permission_key, scope_type, scope_value, effect, result: { ...result, password_reset: result.password_reset || undefined } }, correlationId });
  return NextResponse.json({ ok: true, result, before, after, correlation_id: correlationId });
}
