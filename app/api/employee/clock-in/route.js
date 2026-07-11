import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/clock-in
// Body: { lat, lng } (optional GPS)
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (emp.status === 'terminated') return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
  if (!['active', 'onboarded'].includes(emp.status)) {
    return NextResponse.json({ error: 'Your account is not approved for shifts yet.' }, { status: 403 });
  }

  const { lat, lng } = await req.json().catch(() => ({}));

  // Prevent double clock-in (open shift exists)
  const { data: open } = await supabaseAdmin
    .from('timesheets')
    .select('id, clock_in_at')
    .eq('employee_id', emp.id)
    .is('clock_out_at', null)
    .maybeSingle();
  if (open) {
    return NextResponse.json({ error: 'Already clocked in', shift: open }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: shift, error } = await supabaseAdmin
    .from('timesheets')
    .insert({
      employee_id: emp.id,
      clock_in_at: now,
      clock_in_lat: lat ?? null,
      clock_in_lng: lng ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, shift });
}
