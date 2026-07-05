import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET all upcoming schedule slots with booking counts
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: slots, error } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byDate = {};
  for (const s of slots || []) {
    if (!byDate[s.slot_date]) {
      byDate[s.slot_date] = { date: s.slot_date, day_type: s.day_type, slots: [] };
    }
    byDate[s.slot_date].slots.push(s);
  }

  return NextResponse.json({ schedule: Object.values(byDate) });
}

// POST — toggle slot, set max_jobs, delete day, or add day
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, slot_date, slot_time, max_jobs, is_available } = await req.json();

  if (action === 'toggle') {
    const { data: current } = await supabaseAdmin
      .from('schedule')
      .select('is_available')
      .eq('slot_date', slot_date)
      .eq('slot_time', slot_time)
      .single();

    await supabaseAdmin
      .from('schedule')
      .update({ is_available: !current?.is_available })
      .eq('slot_date', slot_date)
      .eq('slot_time', slot_time);

    return NextResponse.json({ ok: true });
  }

  if (action === 'set_max') {
    await supabaseAdmin
      .from('schedule')
      .update({ max_jobs: parseInt(max_jobs) })
      .eq('slot_date', slot_date)
      .eq('slot_time', slot_time);

    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_day') {
    await supabaseAdmin
      .from('schedule')
      .delete()
      .eq('slot_date', slot_date);

    return NextResponse.json({ ok: true });
  }

  if (action === 'add_day') {
    const times = slot_time || ['07:30', '09:00', '11:00', '13:00'];
    const dow = new Date(`${slot_date}T12:00:00Z`).getUTCDay();
    const day_type = dow === 0 ? 'sunday' : dow === 4 ? 'thursday' : 'custom';

    const rows = times.map((t) => ({
      slot_date,
      slot_time: t,
      day_type,
      max_jobs: max_jobs || 5,
      is_available: true,
    }));

    await supabaseAdmin
      .from('schedule')
      .upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: false });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
