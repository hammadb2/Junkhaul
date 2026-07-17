import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET — list storage facilities
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'storage.manage', action: 'storage.list' });
  if (!auth.ok) return auth.response;
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
  const auth = await requireStaffPermission(req, { permission: 'storage.manage', action: 'storage.manage' });
  if (!auth.ok) return auth.response;
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
