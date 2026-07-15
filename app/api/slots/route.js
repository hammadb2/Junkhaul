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
// Same-day booking is allowed. The only gates are:
//   1. The slot hasn't already passed (for today)
//   2. The slot has remaining capacity
//   3. isWindowFeasible() passes (landfill closing constraint)
// If same-day capacity is full, that's a dispatch/staffing
// problem — not something to hide by flooring the date.
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const loadSize = searchParams.get('load_size') || null;
  const address = searchParams.get('address') || null;

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

  // Group slots by date. If a slot has window_label, it's a window;
  // otherwise it's a legacy pinpoint slot (rendered as before).
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
  // OPTIMIZED: geocode + driving times are computed ONCE, then reused for all slots.
  if (loadSize && address) {
    // Pre-compute geocoding and driving times once for the entire request
    const { geocodeAddress, drivingTimeMinutes, getValidLandfillsForDate, getOnsiteDuration, getUnloadBuffer, timeToMinutes } = await import('@/lib/slotAvailability');

    // Geocode the address ONCE
    let jobCoords = null;
    try {
      jobCoords = await geocodeAddress(address);
    } catch (e) {
      console.error('[slots] Geocoding failed:', e.message);
    }

    // Get landfills for the first date (they're the same for all dates except Sunday)
    // We'll check per-date below, but pre-compute driving times for the common case
    const onsiteDuration = await getOnsiteDuration(loadSize);
    const unloadBuffer = await getUnloadBuffer();

    // If we can't geocode, skip feasibility (show all slots)
    if (jobCoords) {
      // Pre-compute driving time from depot to job (same for all slots)
      const DEPOT = { lat: 51.2128, lng: -114.0081 };
      const driveDepotToJob = await drivingTimeMinutes(DEPOT, jobCoords);

      // Pre-compute driving times to ALL landfills (same for all slots)
      const { data: allLandfills } = await supabaseAdmin
        .from('landfills')
        .select('*')
        .order('name');

      const landfillDriveTimes = [];
      for (const landfill of (allLandfills || [])) {
        if (!landfill.lat || !landfill.lng) continue;
        const driveMin = await drivingTimeMinutes(jobCoords, { lat: landfill.lat, lng: landfill.lng });
        landfillDriveTimes.push({ landfill, driveMin });
      }

      // Now check feasibility per slot using pre-computed values (no more API calls)
      for (const day of days) {
        const dayDow = new Date(day.date + 'T12:00:00Z').getUTCDay();
        const dayMonth = new Date(day.date + 'T12:00:00Z').getUTCMonth() + 1;
        const isWinter = dayMonth >= 11 || dayMonth <= 3;
        const isSunday = dayDow === 0;
        const isWeekday = dayDow >= 1 && dayDow <= 5;

        // Filter landfills valid for this day
        const validLandfillTimes = landfillDriveTimes.filter(({ landfill }) => {
          if (isSunday) {
            if (!landfill.sunday_open) return false;
            if (landfill.summer_only_sunday && isWinter) return false;
            return true;
          }
          if (isWeekday) return landfill.monday_to_friday !== false;
          return true;
        });

        if (validLandfillTimes.length === 0) {
          day.slots = [];
          continue;
        }

        const earliestClose = validLandfillTimes.reduce((earliest, { landfill }) => {
          const close = landfill.close_time || '16:00';
          return close < earliest ? close : earliest;
        }, '23:59');

        const landfillCloseMinutes = timeToMinutes(earliestClose);
        const minDriveToLandfill = Math.min(...validLandfillTimes.map(({ driveMin }) => driveMin));
        const totalAfterArrival = onsiteDuration + minDriveToLandfill + unloadBuffer;
        const latestArrival = landfillCloseMinutes - totalAfterArrival;

        const feasibleSlots = [];
        for (const slot of day.slots) {
          if (slot.window_end) {
            const windowEndMinutes = timeToMinutes(slot.window_end);
            if (windowEndMinutes <= latestArrival) {
              feasibleSlots.push(slot);
            }
          } else {
            feasibleSlots.push(slot);
          }
        }
        day.slots = feasibleSlots;
      }
    }

    // Remove days with no feasible slots
    days = days.filter((d) => d.slots.length > 0);
  }

  // If no slots available, return info for custom slot selection
  if (days.length === 0) {
    const customDays = [];
    const checkDate = new Date(today + 'T00:00:00');
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
      // Uses pre-computed driving times (no new API calls)
      let feasibleSlots = slots;
      if (loadSize && address && jobCoords) {
        const dayDow = new Date(dateStr + 'T12:00:00Z').getUTCDay();
        const dayMonth = new Date(dateStr + 'T12:00:00Z').getUTCMonth() + 1;
        const isWinter = dayMonth >= 11 || dayMonth <= 3;
        const isSunday = dayDow === 0;
        const isWeekday = dayDow >= 1 && dayDow <= 5;

        const validLandfillTimes = landfillDriveTimes.filter(({ landfill }) => {
          if (isSunday) {
            if (!landfill.sunday_open) return false;
            if (landfill.summer_only_sunday && isWinter) return false;
            return true;
          }
          if (isWeekday) return landfill.monday_to_friday !== false;
          return true;
        });

        if (validLandfillTimes.length === 0) {
          feasibleSlots = [];
        } else {
          const earliestClose = validLandfillTimes.reduce((earliest, { landfill }) => {
            const close = landfill.close_time || '16:00';
            return close < earliest ? close : earliest;
          }, '23:59');
          const landfillCloseMinutes = timeToMinutes(earliestClose);
          const minDriveToLandfill = Math.min(...validLandfillTimes.map(({ driveMin }) => driveMin));
          const totalAfterArrival = onsiteDuration + minDriveToLandfill + unloadBuffer;
          const latestArrival = landfillCloseMinutes - totalAfterArrival;

          feasibleSlots = slots.filter((slot) => {
            if (!slot.window_end) return true;
            return timeToMinutes(slot.window_end) <= latestArrival;
          });
        }
      } else if (loadSize && address && !jobCoords) {
        // Can't geocode — keep all slots
        feasibleSlots = slots;
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
    return NextResponse.json({ days: customDays, no_standard_slots: true, earliest_date: today });
  }

  return NextResponse.json({ days, earliest_date: today });
}
