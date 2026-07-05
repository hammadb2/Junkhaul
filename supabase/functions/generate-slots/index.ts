import { supabase } from '../_shared/clients.ts';
import { edmontonNow } from '../_shared/time.ts';

const SLOT_TIMES = ['07:30', '09:00', '11:00', '13:00'];
const MAX_JOBS = 1;
const WEEKS_AHEAD = 16; // 4 months rolling — no hard end date

// Canadian statutory holidays (add more years as needed)
// Format: 'YYYY-MM-DD'
const STAT_HOLIDAYS = new Set([
  '2026-08-03', // Alberta Heritage Day
  '2026-09-07', // Labour Day
  '2026-10-12', // Thanksgiving
  '2026-11-11', // Remembrance Day
  '2026-12-25', // Christmas
  '2026-12-26', // Boxing Day
  '2027-01-01', // New Year's
  '2027-02-15', // Family Day Alberta
  '2027-04-02', // Good Friday
  '2027-05-24', // Victoria Day
  '2027-07-01', // Canada Day
  '2027-08-02', // Alberta Heritage Day
]);

Deno.serve(async () => {
  const now = edmontonNow();

  // Guard: only run at 5AM Monday Calgary time
  if (!(now.weekday === 'Mon' && now.hour === 5)) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'not Monday 5AM Edmonton', now }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Step 1: Clean up old slots (older than 7 days) that have no bookings
  const cutoff = new Date(`${now.date}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  await supabase
    .from('schedule')
    .delete()
    .lt('slot_date', cutoffStr)
    .eq('jobs_booked', 0);

  // Step 2: Generate Thu + Sun slots 16 weeks ahead
  const rows: Record<string, unknown>[] = [];
  const start = new Date(`${now.date}T12:00:00Z`);

  for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dow = d.getUTCDay();

    if (dow !== 0 && dow !== 4) continue; // Sunday=0, Thursday=4

    const dateStr = d.toISOString().slice(0, 10);

    // Skip statutory holidays
    if (STAT_HOLIDAYS.has(dateStr)) continue;

    const day_type = dow === 0 ? 'sunday' : 'thursday';

    for (const t of SLOT_TIMES) {
      rows.push({
        slot_date: dateStr,
        slot_time: t,
        day_type,
        max_jobs: MAX_JOBS,
        is_available: true,
      });
    }
  }

  const { error } = await supabase
    .from('schedule')
    .upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: true });

  return new Response(
    JSON.stringify({ ok: !error, generated: rows.length, error: error?.message }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
