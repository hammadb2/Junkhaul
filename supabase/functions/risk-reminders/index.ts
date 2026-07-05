import { supabase, sendSMS } from '../_shared/clients.ts';
import { edmontonNow, formatTime, formatDateLong } from '../_shared/time.ts';

// ~8PM the evening before, send an extra nudge to high-no-show-risk bookings.
Deno.serve(async () => {
  const now = edmontonNow();
  if (now.hour !== 20) {
    return new Response(JSON.stringify({ skipped: true, now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Tomorrow's date (Calgary local).
  const tomorrow = new Date(`${now.date}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('job_date', tomorrowStr)
    .eq('status', 'confirmed')
    .gte('no_show_risk_score', 50)
    .eq('extra_reminder_sent', false);

  let sent = 0;
  for (const b of bookings || []) {
    const body = `Hi ${b.name}, just confirming your Junk Haul Calgary pickup tomorrow, ${formatDateLong(b.job_date)} at ${formatTime(b.job_time)}.

${b.address}
Balance due: $${b.balance_due}

Reply YES to confirm, or reply to reschedule. See you then!`;
    try {
      await sendSMS(b.phone, body, b.id, 'extra_reminder');
      await supabase
        .from('bookings')
        .update({ extra_reminder_sent: true, extra_reminder_sent_at: new Date().toISOString() })
        .eq('id', b.id);
      sent++;
    } catch (_) {
      /* logged in sendSMS */
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
