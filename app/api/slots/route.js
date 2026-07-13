import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatTime, formatDateLong, dayType, edmontonNowParts } from '@/lib/dates';
import { isWindowFeasible } from '@/lib/slotAvailability';
import { getStringConfig, getNumberConfig } from '@/lib/config';

export const runtime = 'nodejs';

// ============================================================
// GET /api/slots
//
// Returns available arrival windows grouped by date.
//
// Query params (optional, used for landfill feasibility check):
//   load_size — single_item | quarter | half | full
//   address   — job address text (for geocoding + drive time)
//
// The 24-hour minimum advance booking rule is enforced here
// (unchanged from the original logic). The landfill closing
// constraint is checked per-window via isWindowFeasible().
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const loadSize = searchParams.get('load_size') || null;
  const address = searchParams.get('address') || null;

  const { date: today, hour, minute } = edmontonNowParts();
  const currentTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // 24-hour minimum: compute the earliest allowed datetime
  const now = new Date();
  const earliest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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

  // Group slots by date. If a slot has window_label, it's a window;
  // otherwise it's a legacy pinpoint slot (rendered as before).
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

    // Window-based slot
    if (slot.window_label) {
      grouped[slot.slot_date].slots.push({
        time: slot.slot_time,
        label: slot.window_label,
        window_label: slot.window_label,
        window_start: slot.window_start,
        window_end: slot.window_end,
        display: `${slot.window_label} (${formatTime(slot.window_start)}–${formatTime(slot.window_end)})`,
        remaining: slot.max_jobs - slot.jobs_booked,
      });
    } else {
      // Legacy pinpoint slot
      grouped[slot.slot_date].slots.push({
        time: slot.slot_time,
        label: formatTime(slot.slot_time),
        remaining: slot.max_jobs - slot.jobs_booked,
      });
    }
  }

  let days = Object.values(grouped);

  // Apply landfill feasibility check per window if we have load_size + address.
  // This hides windows where the crew can't make the landfill before closing.
  if (loadSize && address) {
    for (const day of days) {
      const feasibleSlots = [];
      for (const slot of day.slots) {
        if (slot.window_end) {
          // It's a window — run the feasibility check
          const feasible = await isWindowFeasible({
            dateStr: day.date,
            windowEnd: slot.window_end,
            loadSize,
            jobAddress: address,
          });
          if (feasible) feasibleSlots.push(slot);
        } else {
          // Legacy pinpoint slot — keep it (no window constraint)
          feasibleSlots.push(slot);
        }
      }
      day.slots = feasibleSlots;
    }
    // Remove days with no feasible slots
    days = days.filter((d) => d.slots.length > 0);
  }

  // If no slots available, return info for custom slot selection
  if (days.length === 0) {
    const customDays = [];
    const checkDate = new Date(eDate + 'T00:00:00');
    const morningStart = await getStringConfig('dispatch_morning_window_start') || '07:30';
    const morningEnd = await getStringConfig('dispatch_morning_window_end') || '11:00';
    const afternoonStart = await getStringConfig('dispatch_afternoon_window_start') || '11:00';
    const afternoonEnd = await getStringConfig('dispatch_afternoon_window_end') || '15:00';
    const windowMaxJobs = await getNumberConfig('dispatch_window_max_jobs') || 4;

    for (let i = 0; i < 30 && customDays.length < 8; i++) {
      const d = new Date(checkDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dow = d.getDay();

      // 24-hour any-day: offer all days, not just Thu/Sun
      const slots = [
        {
          time: morningStart,
          label: 'Morning',
          window_label: 'Morning',
          window_start: morningStart,
          window_end: morningEnd,
          display: `Morning (${formatTime(morningStart)}–${formatTime(morningEnd)})`,
          remaining: windowMaxJobs,
        },
        {
          time: afternoonStart,
          label: 'Afternoon',
          window_label: 'Afternoon',
          window_start: afternoonStart,
          window_end: afternoonEnd,
          display: `Afternoon (${formatTime(afternoonStart)}–${formatTime(afternoonEnd)})`,
          remaining: windowMaxJobs,
        },
      ];

      // Apply landfill feasibility to custom slots too
      let feasibleSlots = slots;
      if (loadSize && address) {
        feasibleSlots = [];
        for (const slot of slots) {
          const feasible = await isWindowFeasible({
            dateStr,
            windowEnd: slot.window_end,
            loadSize,
            jobAddress: address,
          });
          if (feasible) feasibleSlots.push(slot);
        }
      }

      if (feasibleSlots.length > 0) {
        customDays.push({
          date: dateStr,
          label: formatDateLong(dateStr),
          day_type: dayType(dateStr),
          slots: feasibleSlots,
          is_custom: true,
        });
      }
    }
    return NextResponse.json({ days: customDays, no_standard_slots: true, earliest_date: eDate });
  }

  return NextResponse.json({ days, earliest_date: eDate });
}
