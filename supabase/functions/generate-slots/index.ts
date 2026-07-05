import { supabase } from '../_shared/clients.ts';
import { edmontonNow } from '../_shared/time.ts';

// Operating days: Thursday (4) and Sunday (0). Slot times (Calgary local).
const SLOT_TIMES = ['07:30', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
const MAX_JOBS = 5;
const WEEKS_AHEAD = 8;

Deno.serve(async () => {
  const now = edmontonNow();
  // Guard: only actually run around 5AM Monday Calgary time.
  if (!(now.weekday === 'Mon' && now.hour === 5)) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not Monday 5AM Edmonton', now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows: Record<string, unknown>[] = [];
  const start = new Date(`${now.date}T12:00:00Z`);
  for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 4) continue;
    const dateStr = d.toISOString().slice(0, 10);
    const day_type = dow === 0 ? 'sunday' : 'thursday';
    for (const t of SLOT_TIMES) {
      rows.push({ slot_date: dateStr, slot_time: t, day_type, max_jobs: MAX_JOBS });
    }
  }

  const { error } = await supabase
    .from('schedule')
    .upsert(rows, { onConflict: 'slot_date,slot_time', ignoreDuplicates: true });

  return new Response(JSON.stringify({ ok: !error, inserted: rows.length, error: error?.message }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
