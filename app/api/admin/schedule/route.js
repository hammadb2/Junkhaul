import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET() {
  // Use Calgary date, not UTC
  const { date: today } = edmontonNowParts();

  const { data: slots, error } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by date + compute stats
  const byDate = {};
  for (const s of slots || []) {
    if (!byDate[s.slot_date]) {
      byDate[s.slot_date] = {
        date: s.slot_date,
        day_type: s.day_type,
        slots: [],
        total_booked: 0,
        total_capacity: 0,
      };
    }
    byDate[s.slot_date].slots.push(s);
    byDate[s.slot_date].total_booked += s.jobs_booked;
    byDate[s.slot_date].total_capacity += s.max_jobs;
  }

  // Summary stats
  const allDays = Object.values(byDate);
  const totalUpcomingSlots = allDays.reduce((s, d) => s + d.total_capacity, 0);
  const totalBooked = allDays.reduce((s, d) => s + d.total_booked, 0);
  const fillRate = totalUpcomingSlots > 0
    ? Math.round((totalBooked / totalUpcomingSlots) * 100)
    : 0;

  return NextResponse.json({
    schedule: allDays,
    stats: { totalUpcomingSlots, totalBooked, fillRate, operatingDays: allDays.length },
  });
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, slot_date, slot_time, max_jobs } = body;

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
    // Only delete slots with no bookings — protect booked slots
    await supabaseAdmin
      .from('schedule')
      .delete()
      .eq('slot_date', slot_date)
      .eq('jobs_booked', 0);
    return NextResponse.json({ ok: true });
  }

  if (action === 'close_day') {
    // Close all slots for a day (sets is_available = false) without deleting
    await supabaseAdmin
      .from('schedule')
      .update({ is_available: false })
      .eq('slot_date', slot_date);
    return NextResponse.json({ ok: true });
  }

  if (action === 'open_day') {
    await supabaseAdmin
      .from('schedule')
      .update({ is_available: true })
      .eq('slot_date', slot_date);
    return NextResponse.json({ ok: true });
  }

  if (action === 'bulk_set_max') {
    // Set max_jobs for ALL future slots at once (e.g., switch from 1 to 2 if you hire someone)
    const { date: today } = edmontonNowParts();
    await supabaseAdmin
      .from('schedule')
      .update({ max_jobs: parseInt(max_jobs) })
      .gte('slot_date', today)
      .eq('jobs_booked', 0); // don't touch already-booked slots
    return NextResponse.json({ ok: true });
  }

  if (action === 'add_day') {
    const times = body.times || ['07:30', '09:00', '11:00', '13:00'];
    const dow = new Date(`${slot_date}T12:00:00Z`).getUTCDay();
    const day_type = dow === 0 ? 'sunday' : dow === 4 ? 'thursday' : 'custom';
    const rows = times.map((t) => ({
      slot_date,
      slot_time: t,
      day_type,
      max_jobs: max_jobs || 1,
      is_available: true,
    }));
    await supabaseAdmin
      .from('schedule')
      .upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: false });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
