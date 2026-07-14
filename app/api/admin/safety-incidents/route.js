import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

// GET /api/admin/safety-incidents
// Returns all safety incidents, optionally filtered by status
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabaseAdmin
    .from('safety_incidents')
    .select(`
      id,
      employee_id,
      booking_id,
      severity,
      category,
      description,
      photo_urls,
      status,
      resolved_at,
      resolution_notes,
      created_at,
      updated_at,
      employees!safety_incidents_employee_id_fkey(id, first_name, last_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incidents: data || [] });
}

// PATCH /api/admin/safety-incidents
// Update incident status (resolve, dismiss, etc.)
export async function PATCH(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status, resolution_notes } = body;

  if (!id) return NextResponse.json({ error: 'Missing incident id' }, { status: 400 });

  const update = { status };
  if (status === 'resolved' || status === 'dismissed') {
    update.resolved_at = new Date().toISOString();
  }
  if (resolution_notes) {
    update.resolution_notes = resolution_notes;
  }

  const { data, error } = await supabaseAdmin
    .from('safety_incidents')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data });
}
