import { supabase, sendSMS, isKillSwitchOn } from '../_shared/clients.ts';
import { edmontonNow, formatTime, formatDateLong } from '../_shared/time.ts';

Deno.serve(async () => {
  if (!(await isKillSwitchOn('day_summary'))) {
    return new Response(JSON.stringify({ skipped: true, reason: 'kill_switch_off' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = edmontonNow();
  // ~6:30AM on operating days (Sundays). Cron fires at :30 each hour.
  if (now.hour !== 6 || now.weekday !== 'Sun') {
    return new Response(JSON.stringify({ skipped: true, now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('job_date', now.date)
    .in('status', ['confirmed', 'rescheduled'])
    .order('job_time', { ascending: true });

  if (!bookings || bookings.length === 0) {
    await sendSMS(
      Deno.env.get('HAMMAD_PHONE')!,
      `${formatDateLong(now.date)}, no jobs booked today. Enjoy the day off!`,
      null,
      'day_summary',
    );
    return new Response(JSON.stringify({ ok: true, jobs: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const revenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const lines = bookings
    .map(
      (b, i) =>
        `${i + 1}. ${formatTime(b.job_time)} — ${b.name} (${b.quadrant || '?'})\n   ${b.address}\n   $${b.total_price}${b.flag_for_review ? ' 🚨' : ''}${b.has_freon ? ' 🌡️' : ''}`,
    )
    .join('\n');

  const body = `${formatDateLong(now.date)}, ${bookings.length} jobs, $${revenue} expected

${lines}

Dispatch: ${Deno.env.get('SITE_URL') || 'https://junkhaul.ca'}/admin`;

  await sendSMS(Deno.env.get('HAMMAD_PHONE')!, body, null, 'day_summary');

  return new Response(JSON.stringify({ ok: true, jobs: bookings.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
