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

// GET — list donation centers
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('donation_centers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ centers: data });
}

// POST — create or update donation center
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, name, address, lat, lng, phone, hours, accepted_items } = body;
  if (!name || !address) return NextResponse.json({ error: 'Name and address required' }, { status: 400 });

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('donation_centers')
      .update({ name, address, lat, lng, phone, hours, accepted_items, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ center: data });
  }

  const { data, error } = await supabaseAdmin
    .from('donation_centers')
    .insert({ name, address, lat, lng, phone, hours, accepted_items })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ center: data });
}
