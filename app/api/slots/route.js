import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatTime, formatDateLong, dayType, edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';

export async function GET() {
  const { date: today, hour, minute } = edmontonNowParts();
  const currentTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // 24-hour minimum: compute the earliest allowed datetime
  const now = new Date();
  const earliest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const earliestDate = earliest.toISOString().slice(0, 10);
  const earliestHour = earliest.getUTCHours();
  // Convert earliest to Edmonton time for comparison
  const earliestEdmonton = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(earliest);
  const eDate = earliestEdmonton.find(p => p.type === 'year')?.value + '-' +
    earliestEdmonton.find(p => p.type === 'month')?.value + '-' +
    earliestEdmonton.find(p => p.type === 'day')?.value;
  const eTime = (earliestEdmonton.find(p => p.type === 'hour')?.value || '00') + ':' +
    (earliestEdmonton.find(p => p.type === 'minute')?.value || '00');

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
    // Enforce 24-hour minimum: skip slots before earliest allowed time
    if (slot.slot_date < eDate) continue;
    if (slot.slot_date === eDate && slot.slot_time <= eTime) continue;
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

  const days = Object.values(grouped);

  // If no slots available, return info for custom slot selection
  if (days.length === 0) {
    // Generate next 4 Thursdays and Sundays for custom selection
    const customDays = [];
    const checkDate = new Date(eDate + 'T00:00:00');
    for (let i = 0; i < 30 && customDays.length < 8; i++) {
      const d = new Date(checkDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dow = d.getDay(); // 0=Sunday, 4=Thursday
      if (dow === 0 || dow === 4) {
        customDays.push({
          date: dateStr,
          label: formatDateLong(dateStr),
          day_type: dayType(dateStr),
          slots: [
            { time: '07:30', label: '7:30 AM', remaining: 5 },
            { time: '09:00', label: '9:00 AM', remaining: 5 },
            { time: '11:00', label: '11:00 AM', remaining: 5 },
            { time: '13:00', label: '1:00 PM', remaining: 5 },
            { time: '15:00', label: '3:00 PM', remaining: 5 },
          ],
          is_custom: true,
        });
      }
    }
    return NextResponse.json({ days: customDays, no_standard_slots: true, earliest_date: eDate });
  }

  return NextResponse.json({ days, earliest_date: eDate });
}
