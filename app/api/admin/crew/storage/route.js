import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = await adminToken();
  return token === expected;
}

// GET — list storage facilities
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('storage_facilities')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ facilities: data });
}

// POST — create or update storage facility
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, name, address, lat, lng, access_code, capacity_sqft } = body;
  if (!name || !address) return NextResponse.json({ error: 'Name and address required' }, { status: 400 });

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('storage_facilities')
      .update({ name, address, lat, lng, access_code, capacity_sqft, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ facility: data });
  }

  const { data, error } = await supabaseAdmin
    .from('storage_facilities')
    .insert({ name, address, lat, lng, access_code, capacity_sqft })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ facility: data });
}
