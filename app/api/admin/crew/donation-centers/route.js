import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET — list donation centers
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'donation_centers.manage', action: 'donation_centers.list' });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin
    .from('donation_centers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ centers: data });
}

// POST — create or update donation center
export async function POST(req) {
  const auth = await requireStaffPermission(req, { permission: 'donation_centers.manage', action: 'donation_centers.manage' });
  if (!auth.ok) return auth.response;
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
