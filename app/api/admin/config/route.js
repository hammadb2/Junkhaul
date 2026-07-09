import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { invalidateConfigCache } from '@/lib/config';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/config — returns all runtime config rows
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { updates, updated_by } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const rows = updates.map((u) => ({
      key: u.key,
      value: String(u.value),
      value_type: u.value_type || 'string',
      description: u.description || null,
      category: u.category || 'general',
      updated_by: updated_by || 'admin',
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

    return NextResponse.json({ updated: data.length, config: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Auth guard placeholder - will be added
