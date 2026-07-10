import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/truck-check — record truck pickup or return check
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    assignment_id, check_type, // 'pickup' or 'return'
    dashboard_photo_url, odometer_km, fuel_level, fuel_percent,
    truck_photos, damage_notes,
    gas_receipt_url, gas_amount_cad, gas_station,
  } = body;

  if (!assignment_id || !check_type) {
    return NextResponse.json({ error: 'assignment_id and check_type are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('truck_checks')
    .insert({
      assignment_id,
      check_type,
      dashboard_photo_url: dashboard_photo_url || null,
      odometer_km: odometer_km || null,
      fuel_level: fuel_level || null,
      fuel_percent: fuel_percent || null,
      truck_photos: truck_photos || [],
      damage_notes: damage_notes || null,
      gas_receipt_url: gas_receipt_url || null,
      gas_amount_cad: gas_amount_cad || null,
      gas_station: gas_station || null,
      created_by: emp.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, check: data });
}

// GET — list truck checks for an assignment
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get('assignment_id');
  if (!assignmentId) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('truck_checks')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ checks: data || [] });
}
