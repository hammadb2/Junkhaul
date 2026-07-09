import { supabase, sendSMS, isKillSwitchOn } from '../_shared/clients.ts';
import { edmontonNow, formatTime } from '../_shared/time.ts';

Deno.serve(async () => {
  if (!(await isKillSwitchOn('morning_reminders'))) {
    return new Response(JSON.stringify({ skipped: true, reason: 'kill_switch_off' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = edmontonNow();
  if (now.hour !== 7) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not 7AM Edmonton', now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('job_date', now.date)
    .eq('status', 'confirmed')
    .eq('morning_reminder_sent', false);

  let sent = 0;
  for (const b of bookings || []) {
    const body = `Good morning ${b.name}, Junk Haul Calgary here!

Your pickup is today at ${formatTime(b.job_time)}.
${b.address}
Balance due: $${b.balance_due} (cash or card on pickup)

Reply CANCEL to cancel or RESCHEDULE to move to another day.

We'll text you when we're on the way!`;
    try {
      await sendSMS(b.phone, body, b.id, 'reminder');
      await supabase.from('bookings').update({ morning_reminder_sent: true }).eq('id', b.id);
      sent++;
    } catch (_) {
      /* logged in sendSMS */
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
