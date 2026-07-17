import { NextResponse } from 'next/server';
import { getAuthedEmployee } from './employeeAuth';
import { getStaffPermissions, getStaffRoles } from './permissions';
import { OWNER_ONLY_PERMISSIONS } from './permissionRules';
import { recordAuditEvent } from './auditEvents';
import { supabaseAdmin } from './supabase';

const SENSITIVE_KEYS = [
  'sin',
  'bank',
  'banking',
  'account',
  'routing',
  'transit',
  'institution',
  'password',
  'token',
  'secret',
  'key',
  'enc',
];

export function jsonUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function jsonForbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((needle) => lower.includes(needle))) {
      out[key] = '[REDACTED]';
    } else if (raw && typeof raw === 'object') {
      out[key] = redactSensitive(raw);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

export function redactEmployee(employee, { includeCompensation = false, includeSensitive = false } = {}) {
  if (!employee) return employee;
  const copy = { ...employee };
  if (!includeCompensation) {
    delete copy.pay_rate;
    delete copy.td1_federal_data;
    delete copy.td1_ab_data;
  }
  if (!includeSensitive) {
    for (const key of Object.keys(copy)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((needle) => lower.includes(needle))) delete copy[key];
    }
    delete copy.license_data;
    delete copy.contract_data;
  }
  return copy;
}

export async function getStaffContext(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return null;
  const [roles, permissions] = await Promise.all([
    getStaffRoles(employee.id),
    getStaffPermissions(employee.id),
  ]);
  return { employee, roles, permissions };
}

export function hasPermission(context, permission, { ownerOnly = false } = {}) {
  if (!context?.employee) return false;
  if (context.roles.includes('owner')) return true;
  if (ownerOnly || OWNER_ONLY_PERMISSIONS.has(permission)) return false;
  return context.permissions.includes(permission);
}

export async function hasManagerScope(employeeId, scopeType, scopeValue) {
  if (!employeeId || !scopeType || !scopeValue) return false;
  const { data } = await supabaseAdmin
    .from('manager_scopes')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('scope_type', scopeType)
    .eq('scope_value', String(scopeValue))
    .is('revoked_at', null)
    .limit(1);
  return (data || []).length > 0;
}

export async function auditSensitiveAttempt({
  context,
  allowed,
  permission,
  entityType = 'admin_action',
  entityId = null,
  action,
  reason = null,
  metadata = {},
  before = null,
  after = null,
  correlationId = null,
}) {
  await recordAuditEvent({
    entity_type: entityType,
    entity_id: entityId,
    event_type: allowed ? 'sensitive_action_allowed' : 'sensitive_action_denied',
    actor_type: context?.employee ? 'employee' : 'anonymous',
    actor_id: context?.employee?.id || null,
    source: 'admin_api',
    before: redactSensitive(before),
    after: redactSensitive(after),
    reason,
    metadata: redactSensitive({
      permission,
      action,
      roles: context?.roles || [],
      allowed,
      ...metadata,
    }),
    correlation_id: correlationId,
  });
}

export async function requireStaffPermission(req, {
  permission,
  ownerOnly = false,
  entityType = 'admin_action',
  entityId = null,
  action = permission,
  reason = null,
  metadata = {},
  auditDenied = true,
} = {}) {
  const context = await getStaffContext(req);
  if (!context) return { ok: false, status: 401, response: jsonUnauthorized(), context: null };
  const allowed = hasPermission(context, permission, { ownerOnly });
  if (!allowed) {
    if (auditDenied) {
      await auditSensitiveAttempt({
        context,
        allowed: false,
        permission,
        entityType,
        entityId,
        action,
        reason,
        metadata,
      });
    }
    return { ok: false, status: 403, response: jsonForbidden(), context };
  }
  return { ok: true, context };
}
