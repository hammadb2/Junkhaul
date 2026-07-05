import { supabase, sendSMS } from '../_shared/clients.ts';
import { edmontonNow, formatTime } from '../_shared/time.ts';

// Runs every 30 min during the day. Alerts the operator once when a job's
// start time has passed by 45+ min and it's still not marked complete.
Deno.serve(async () => {
  const now = edmontonNow();
  if (now.hour < 7 || now.hour > 17) {
    return new Response(JSON.stringify({ skipped: true, now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('job_date', now.date)
    .in('status', ['confirmed', 'rescheduled']);

  const nowMinutes = now.hour * 60 + now.minute;
  let alerted = 0;

  for (const b of bookings || []) {
    const [h, m] = b.job_time.split(':').map((x: string) => parseInt(x, 10));
    const slotMinutes = h * 60 + m;
    if (nowMinutes - slotMinutes < 45) continue;

    // Only alert once per booking.
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('booking_id', b.id)
      .eq('message_type', 'noshow_alert')
      .limit(1);
    if (existing && existing.length > 0) continue;

    // MSG 13 — customer no-show SMS
    await sendSMS(
      b.phone,
      `Hi ${b.name}, we're at ${b.address} for your Junk Haul Calgary pickup (Ref: ${b.booking_ref}).\n\nWe can't find your items. Please reply or call us at (587) 325-0751.\n\nWe'll wait 15 minutes before heading to our next job.`,
      b.id,
      'noshow_customer',
    );

    // Operator alert
    await sendSMS(
      Deno.env.get('HAMMAD_PHONE')!,
      `Possible no-show: ${b.booking_ref}\n${b.name} (${b.phone})\nScheduled ${formatTime(b.job_time)} at ${b.address}, still not completed.\nMark no-show in dispatch if they're not there.`,
      b.id,
      'noshow_alert',
    );
    alerted++;
  }

  return new Response(JSON.stringify({ ok: true, alerted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
