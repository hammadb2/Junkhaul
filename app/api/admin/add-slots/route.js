import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// Admin can add custom slots for any day (e.g. a Thursday or weekday).
// Body: { date: "2026-07-10", times: ["07:30","09:00","11:00","13:00"], max_jobs: 5, day_type: "custom" }
export async function POST(req) {
  const auth = await requireStaffPermission(req, { permission: 'schedule.manage', action: 'schedule.add_slots' });
  if (!auth.ok) return auth.response;

  const { date, times, max_jobs = 5, day_type = 'custom' } = await req.json();
  if (!date || !Array.isArray(times) || times.length === 0) {
    return NextResponse.json({ error: 'date and times[] required' }, { status: 400 });
  }

  const rows = times.map((t) => ({
    slot_date: date,
    slot_time: t,
    day_type,
    max_jobs,
    is_available: true,
  }));

  const { error } = await supabaseAdmin
    .from('schedule')
    .upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
}

// Delete slots for a date
export async function DELETE(req) {
  const auth = await requireStaffPermission(req, { permission: 'schedule.manage', action: 'schedule.delete_slots' });
  if (!auth.ok) return auth.response;

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('schedule')
    .delete()
    .eq('slot_date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
