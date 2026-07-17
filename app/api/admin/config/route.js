import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { invalidateConfigCache } from '@/lib/config';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/config — returns all runtime config rows
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'config.read',
    action: 'config.read',
    metadata: { route: '/api/admin/config' },
  });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin
    .from('system_config')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data || [] });
}

// POST /api/admin/config — updates one or more config values
export async function POST(req) {
  try {
    const body = await req.json();
    const { updates, updated_by, reason = null } = body;
    const auth = await requireStaffPermission(req, {
      permission: 'config.manage_sensitive',
      ownerOnly: true,
      action: 'config.manage_sensitive',
      reason,
      metadata: { update_count: Array.isArray(updates) ? updates.length : 0 },
    });
    if (!auth.ok) return auth.response;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 422 });
    }
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });

    const now = new Date().toISOString();
    const rows = updates.map((u) => ({
      key: u.key,
      value: String(u.value),
      value_type: u.value_type || 'string',
      description: u.description || null,
      category: u.category || 'general',
      updated_by: updated_by || auth.context.employee.id,
      updated_at: now,
    }));

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .upsert(rows, { onConflict: 'key', ignoreDuplicates: false })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateConfigCache();

    await auditSensitiveAttempt({
      context: auth.context,
      allowed: true,
      permission: 'config.manage_sensitive',
      entityType: 'system_config',
      action: 'config.manage_sensitive',
      reason,
      after: rows,
      metadata: { keys: rows.map((row) => row.key) },
    });

    return NextResponse.json({ updated: data.length, config: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Auth guard placeholder - will be added
