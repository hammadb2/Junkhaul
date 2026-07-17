import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/employee/storage-drop — record items dropped at storage facility
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    assignment_id, facility_id, booking_id,
    item_photos, capacity_photo_url, capacity_estimate_pct,
    route_id, route_version,
  } = body;

  if (!facility_id) {
    return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
  }

  const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
    isLegacyPinAuth: false,
    actionType: 'storage_drop',
    employeeId: emp?.id,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  const { data, error } = await supabaseAdmin
    .from('storage_drops')
    .insert({
      assignment_id: assignment_id || null,
      facility_id,
      booking_id: booking_id || null,
      item_photos: item_photos || [],
      capacity_photo_url: capacity_photo_url || null,
      capacity_estimate_pct: capacity_estimate_pct || null,
      created_by: emp.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update facility capacity if estimate provided
  if (capacity_estimate_pct !== undefined && capacity_estimate_pct !== null) {
    await supabaseAdmin
      .from('storage_facilities')
      .update({ current_usage_pct: capacity_estimate_pct, updated_at: new Date().toISOString() })
      .eq('id', facility_id);
  }

  return NextResponse.json({ ok: true, drop: data });
}

// GET — list storage facilities (for crew to select)
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('storage_facilities')
    .select('id, name, address, lat, lng, access_code, capacity_sqft, current_usage_pct')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ facilities: data || [] });
}
