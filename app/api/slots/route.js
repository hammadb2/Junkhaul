import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatTime, formatDateLong, dayType, edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';

export async function GET() {
  const { date: today, hour, minute } = edmontonNowParts();
  const currentTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const { data, error } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .gte('slot_date', today)
    .eq('is_available', true)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = {};
  for (const slot of data) {
    if (slot.jobs_booked >= slot.max_jobs) continue;
    // Hide past time slots for today
    if (slot.slot_date === today && slot.slot_time <= currentTimeStr) continue;
    if (!grouped[slot.slot_date]) {
      grouped[slot.slot_date] = {
        date: slot.slot_date,
        label: formatDateLong(slot.slot_date),
        day_type: dayType(slot.slot_date),
        slots: [],
      };
    }
    grouped[slot.slot_date].slots.push({
      time: slot.slot_time,
      label: formatTime(slot.slot_time),
      remaining: slot.max_jobs - slot.jobs_booked,
    });
  }

  return NextResponse.json({ days: Object.values(grouped) });
}
