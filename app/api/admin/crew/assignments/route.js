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

// GET /api/admin/crew/assignments — list crew assignments (optionally filter by date)
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabaseAdmin
    .from('crew_assignments')
    .select(`
      *,
      driver:driver_employee_id (id, name, first_name, last_name, phone, status),
      secondary:secondary_employee_id (id, name, first_name, last_name, phone, status)
    `)
    .order('assignment_date', { ascending: false });

  if (date) {
    query = query.eq('assignment_date', date);
  } else if (from && to) {
    query = query.gte('assignment_date', from).lte('assignment_date', to);
  } else if (from) {
    query = query.gte('assignment_date', from);
  }

  const { data: assignments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assignments: assignments || [] });
}

// POST /api/admin/crew/assignments — create/update crew assignment for a date
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    assignment_date,
    driver_employee_id,
    secondary_employee_id,
    uhaul_location,
    uhaul_location_lat,
    uhaul_location_lng,
    id,
  } = body;

  if (!assignment_date || !driver_employee_id) {
    return NextResponse.json({ error: 'assignment_date and driver_employee_id are required' }, { status: 400 });
  }

  const payload = {
    assignment_date,
    driver_employee_id,
    secondary_employee_id: secondary_employee_id || null,
    uhaul_location: uhaul_location || null,
    uhaul_location_lat: uhaul_location_lat || null,
    uhaul_location_lng: uhaul_location_lng || null,
    updated_at: new Date().toISOString(),
  };

  let assignment, error;

  if (id) {
    // Update existing
    ({ data: assignment, error } = await supabaseAdmin
      .from('crew_assignments')
      .update(payload)
      .eq('id', id)
      .select()
      .single());
  } else {
    // Upsert by (assignment_date, driver_employee_id) unique constraint
    ({ data: assignment, error } = await supabaseAdmin
      .from('crew_assignments')
      .upsert(payload, { onConflict: 'assignment_date,driver_employee_id' })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, assignment });
}
