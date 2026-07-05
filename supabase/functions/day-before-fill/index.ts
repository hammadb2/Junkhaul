import { supabase, sendSMS } from '../_shared/clients.ts';
import { edmontonNow, formatDateLong } from '../_shared/time.ts';

Deno.serve(async () => {
  const now = edmontonNow();
  if ((now.weekday !== 'Wed' && now.weekday !== 'Sat') || now.hour !== 20) {
    return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const start = new Date(`${now.date}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 1);
  const targetDate = start.toISOString().slice(0, 10);

  const { data: slots } = await supabase.from('schedule').select('*').eq('slot_date', targetDate).eq('is_available', true);
  const totalCapacity = (slots || []).reduce((s, sl) => s + sl.max_jobs, 0);
  const totalBooked = (slots || []).reduce((s, sl) => s + sl.jobs_booked, 0);
  const openSlots = totalCapacity - totalBooked;

  if (openSlots === 0) return new Response(JSON.stringify({ skipped: true, reason: 'fully booked' }), { headers: { 'Content-Type': 'application/json' } });

  const { data: waitlist } = await supabase.from('waitlist').select('*').is('converted_to_booking_id', null);
  let sent = 0;
  for (const entry of waitlist || []) {
    const msg = `Last chance — ${openSlots} spot${openSlots > 1 ? 's' : ''} left for tomorrow (${formatDateLong(targetDate)}). After tonight these go to same-day pricing (+$50). Book now: https://junkhaul.ca/book — Junk Haul Calgary`;
    try {
      await sendSMS(entry.phone, msg, null, 'day_before_urgency');
      sent++;
    } catch (_) {}
  }

  return new Response(JSON.stringify({ ok: true, targetDate, openSlots, sent }), { headers: { 'Content-Type': 'application/json' } });
});
