// ============================================================
// rehaul.js
//
// Rehaul domain, tenancy boundary, and role-based permissions.
// - Resolve tenant from host header.
// - Enforce that JunkHaul admin routes are never reachable on the Rehaul host.
// - Check Rehaul permissions via rehaul_user_roles + rehaul_role_permissions.
// ============================================================

import { supabaseAdmin } from './supabase.js';

const DEFAULT_HOST = 'www.junkhaul.ca';
const REHAUL_HOST = 'rehaul.junkhaul.ca';

export function tenantFromHost(host) {
  const h = (host || '').split(':')[0].toLowerCase();
  if (h === 'localhost' || h === DEFAULT_HOST || h === 'junkhaul.ca') return 'junkhaul';
  if (h.startsWith('rehaul.') || h === REHAUL_HOST) return 'rehaul';
  if (h.includes('rehaul')) return 'rehaul';
  return 'junkhaul';
}

export async function getTenantBySlug(slug, client = supabaseAdmin) {
  const { data, error } = await client.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTenantByHost(host, client = supabaseAdmin) {
  const slug = tenantFromHost(host);
  return getTenantBySlug(slug, client);
}

export function isRehaulHost(host) {
  return tenantFromHost(host) === 'rehaul';
}

export function isAdminPath(pathname) {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

export function shouldBlockAdminOnRehaul(host, pathname) {
  return isRehaulHost(host) && isAdminPath(pathname);
}

export async function getUserRehaulRoles({ userId, tenantSlug = 'rehaul', client = supabaseAdmin }) {
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).single();
  if (!tenant) return [];

  const { data, error } = await client
    .from('rehaul_user_roles')
    .select('rehaul_roles(name, id), rehaul_role_permissions(rehaul_permissions(permission))')
    .eq('tenant_id', tenant.id)
    .eq('user_id', userId);
  if (error) throw error;

  const roles = [];
  const permissions = new Set();
  for (const row of data || []) {
    roles.push(row.rehaul_roles?.name);
    for (const p of row.rehaul_role_permissions || []) {
      permissions.add(p.rehaul_permissions?.permission);
    }
  }
  return { roles, permissions: Array.from(permissions) };
}

export async function hasRehaulPermission({ userId, tenantSlug = 'rehaul', permission, client = supabaseAdmin }) {
  const { permissions } = await getUserRehaulRoles({ userId, tenantSlug, client });
  return permissions.includes('rehaul:admin') || permissions.includes('rehaul:owner') || permissions.includes(permission);
}

export function requireRehaulPermission(permission) {
  return async function (userId, tenantSlug = 'rehaul', client = supabaseAdmin) {
    const ok = await hasRehaulPermission({ userId, tenantSlug, permission, client });
    if (!ok) throw new Error(`Missing Rehaul permission: ${permission}`);
  };
}

export async function assignRehaulRole({ userId, tenantSlug = 'rehaul', roleName, client = supabaseAdmin }) {
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).single();
  if (!tenant) throw new Error('Tenant not found');

  const { data: role } = await client.from('rehaul_roles').select('id').eq('tenant_id', tenant.id).eq('name', roleName).single();
  if (!role) throw new Error(`Role ${roleName} not found`);

  const { data, error } = await client.from('rehaul_user_roles')
    .insert({ tenant_id: tenant.id, user_id: userId, role_id: role.id })
    .select().single();
  if (error) throw error;
  return data;
}

export async function listRehaulRoles(tenantSlug = 'rehaul', client = supabaseAdmin) {
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) return [];
  const { data, error } = await client.from('rehaul_roles')
    .select('*, rehaul_role_permissions(rehaul_permissions(permission, description))')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}
