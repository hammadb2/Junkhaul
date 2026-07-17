import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { recordAuditEvent } from '@/lib/auditEvents';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

const ROLE_NAMES = new Set(['owner', 'admin', 'manager', 'employee']);
const SCOPE_TYPES = new Set(['booking', 'date', 'quadrant', 'crew_assignment', 'crew', 'employee', 'truck', 'shift', 'route_plan', 'daily_operation']);

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
  const auth = await requireStaffPermission(req, {
    permission: 'staff_access.manage',
    ownerOnly: true,
    action: 'staff_access.read',
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const [{ data: employees }, { data: roles }, { data: permissions }, { data: rolePermissions }, { data: audit }] = await Promise.all([
    employeeId
      ? supabaseAdmin.from('employees').select('id, email, name, first_name, last_name, phone, status').eq('id', employeeId)
      : supabaseAdmin.from('employees').select('id, email, name, first_name, last_name, phone, status').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('staff_roles').select('*').order('name'),
    supabaseAdmin.from('permissions').select('*').order('key'),
    supabaseAdmin.from('staff_role_permissions').select('role_id, permission:permissions(id,key,owner_only), role:staff_roles(id,name)'),
    supabaseAdmin.from('audit_events').select('*').eq('entity_type', 'staff_access').order('created_at', { ascending: false }).limit(100),
  ]);

  const snapshots = {};
  for (const employee of employees || []) snapshots[employee.id] = await getAccessSnapshot(employee.id);
  return NextResponse.json({ employees: employees || [], roles: roles || [], permissions: permissions || [], role_permissions: rolePermissions || [], access: snapshots, audit: audit || [] });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { action, employee_id, role, permission_key, scope_type, scope_value, effect = 'allow', expires_at = null, priority = 0, reason = null } = body;
  const auth = await requireStaffPermission(req, {
    permission: 'staff_access.manage',
    ownerOnly: true,
    entityType: 'staff_access',
    entityId: employee_id || null,
    action: `staff_access.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;
  if (!employee_id || !action) return NextResponse.json({ error: 'employee_id and action required' }, { status: 422 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
  if (employee_id === auth.context.employee.id && ['assign_role', 'remove_role', 'assign_permission', 'remove_permission', 'disable_access'].includes(action)) {
    return NextResponse.json({ error: 'You cannot change your own access.' }, { status: 409 });
  }

  const before = await getAccessSnapshot(employee_id);
  const correlationId = randomUUID();
  let result = {};

  if (action === 'assign_role') {
    if (!ROLE_NAMES.has(role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 422 });
    const { data: roleRow } = await supabaseAdmin.from('staff_roles').select('id,name').eq('name', role).single();
    await supabaseAdmin.from('staff_role_assignments').insert({ employee_id, role_id: roleRow.id, assigned_by: auth.context.employee.id }).throwOnError();
    result.role = role;
  } else if (action === 'remove_role') {
    if (!ROLE_NAMES.has(role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 422 });
    await ensureNotFinalOwner(employee_id, role);
    const { data: roleRow } = await supabaseAdmin.from('staff_roles').select('id,name').eq('name', role).single();
    await supabaseAdmin.from('staff_role_assignments').update({ revoked_at: new Date().toISOString() }).eq('employee_id', employee_id).eq('role_id', roleRow.id).is('revoked_at', null);
    result.role = role;
  } else if (action === 'assign_permission' || action === 'remove_permission') {
    if (!permission_key) return NextResponse.json({ error: 'permission_key required' }, { status: 422 });
    const { data: permission } = await supabaseAdmin.from('permissions').select('*').eq('key', permission_key).maybeSingle();
    if (!permission) return NextResponse.json({ error: 'Unknown permission key.' }, { status: 422 });
    if (permission.owner_only && action !== 'remove_permission') return NextResponse.json({ error: 'Owner-only permissions are granted through owner role assignment only.' }, { status: 409 });
    if (action === 'assign_permission') {
      await supabaseAdmin.from('staff_user_permissions').insert({
        employee_id,
        permission_id: permission.id,
        granted_by: auth.context.employee.id,
        reason,
      }).throwOnError();
    } else {
      await supabaseAdmin.from('staff_user_permissions').update({
        revoked_at: new Date().toISOString(),
        revoked_by: auth.context.employee.id,
      }).eq('employee_id', employee_id).eq('permission_id', permission.id).is('revoked_at', null);
    }
    result.permission_key = permission_key;
  } else if (action === 'assign_scope') {
    if (!SCOPE_TYPES.has(scope_type) || !scope_value) return NextResponse.json({ error: 'valid scope_type and scope_value required' }, { status: 422 });
    if (!['allow', 'deny'].includes(effect)) return NextResponse.json({ error: 'effect must be allow or deny' }, { status: 422 });
    const { data: scope } = await supabaseAdmin.from('manager_scopes').insert({
      employee_id,
      scope_type,
      scope_value: String(scope_value),
      effect,
      expires_at,
      priority,
      reason,
      created_by: auth.context.employee.id,
    }).select().single();
    result.scope = scope;
  } else if (action === 'remove_scope') {
    if (!body.scope_id) return NextResponse.json({ error: 'scope_id required' }, { status: 422 });
    await supabaseAdmin.from('manager_scopes').update({ revoked_at: new Date().toISOString() }).eq('id', body.scope_id).eq('employee_id', employee_id);
    result.scope_id = body.scope_id;
  } else if (action === 'disable_access') {
    await Promise.all([
      supabaseAdmin.from('staff_role_assignments').update({ revoked_at: new Date().toISOString() }).eq('employee_id', employee_id).is('revoked_at', null),
      supabaseAdmin.from('manager_scopes').update({ revoked_at: new Date().toISOString() }).eq('employee_id', employee_id).is('revoked_at', null),
      supabaseAdmin.from('employee_sessions').delete().eq('employee_id', employee_id),
    ]);
  } else {
    return NextResponse.json({ error: 'Unsupported staff access action.' }, { status: 422 });
  }

  const after = await getAccessSnapshot(employee_id);
  await auditAccess({ context: auth.context, targetId: employee_id, action: `staff_access.${action}`, before, after, reason, metadata: { role, permission_key, scope_type, scope_value, effect, result }, correlationId });
  return NextResponse.json({ ok: true, result, before, after, correlation_id: correlationId });
}
