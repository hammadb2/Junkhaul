import { supabase, sendSMS } from '../_shared/clients.ts';
import { edmontonNow, formatDateLong } from '../_shared/time.ts';

Deno.serve(async () => {
  const now = edmontonNow();
  if ((now.weekday !== 'Tue' && now.weekday !== 'Fri') || now.hour !== 9) {
    return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const targetDow = now.weekday === 'Tue' ? 4 : 0;
  const start = new Date(`${now.date}T12:00:00Z`);
  let targetDate = '';
  for (let i = 1; i <= 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (d.getUTCDay() === targetDow) { targetDate = d.toISOString().slice(0, 10); break; }
  }
  if (!targetDate) return new Response(JSON.stringify({ error: 'no target date' }), { headers: { 'Content-Type': 'application/json' } });

  const { data: slots } = await supabase.from('schedule').select('*').eq('slot_date', targetDate).eq('is_available', true);
  const totalCapacity = (slots || []).reduce((s, sl) => s + sl.max_jobs, 0);
  const totalBooked = (slots || []).reduce((s, sl) => s + sl.jobs_booked, 0);
  const fillRate = totalCapacity > 0 ? totalBooked / totalCapacity : 1;

  if (fillRate >= 0.75) return new Response(JSON.stringify({ skipped: true, reason: `${Math.round(fillRate * 100)}% full` }), { headers: { 'Content-Type': 'application/json' } });

  const openSlots = totalCapacity - totalBooked;
  const { data: waitlist } = await supabase.from('waitlist').select('*').eq('notified', false);

  let sent = 0;
  for (const entry of waitlist || []) {
    const msg = `Hi ${entry.name}! Junk Haul Calgary here — ${openSlots} slot${openSlots > 1 ? 's' : ''} just opened for ${formatDateLong(targetDate)}. First come first served: https://junkhaul.ca/book`;
    try {
      await sendSMS(entry.phone, msg, null, 'slot_fill_blast');
      await supabase.from('waitlist').update({ notified: true, notified_at: new Date().toISOString() }).eq('id', entry.id);
      sent++;
    } catch (_) {}
  }

  return new Response(JSON.stringify({ ok: true, targetDate, sent }), { headers: { 'Content-Type': 'application/json' } });
});
