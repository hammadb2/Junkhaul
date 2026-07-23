import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed, logEvent } from '@/lib/audit';
import { edmontonNowParts, formatTime } from '@/lib/dates';

export const runtime = 'nodejs';

// ============================================================
// DAY-OF REMINDER CRON (audit A2/A3)
// Runs every 30 minutes. The confirmation SMS/email and the web
// confirmation screen all promise "we'll text you the morning of
// your pickup" with a live tracking link, but nothing ever sent
// that text -- bookings.morning_reminder_sent existed as a column
// since 0001_init.sql but was never referenced anywhere in the app.
//
// This also closes A3: the tracking link is otherwise only ever
// texted post-completion (review-request cron), so today's the
// first time most customers see it while the job is still upcoming.
// ============================================================

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'day-of-reminder';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn('morning_reminders'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const { date: today } = edmontonNowParts();

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('job_date', today)
      .eq('status', 'confirmed')
      .eq('morning_reminder_sent', false);

    let sentCount = 0;
    const errors = [];
    for (const booking of bookings || []) {
      try {
        const trackingId = booking.tracking_token || booking.id;
        const trackingUrl = `https://junkhaul.ca/track/${trackingId}`;
        const timeStr = booking.job_time ? ` around ${formatTime(booking.job_time)}` : '';
        const msg = `Good morning ${booking.name}! Your Junk Haul Calgary pickup is today${timeStr}. Track your crew live: ${trackingUrl}`;
        await sendSMS(booking.phone, msg, booking.id, 'day_of_reminder');
        await supabaseAdmin
          .from('bookings')
          .update({ morning_reminder_sent: true })
          .eq('id', booking.id);
        await logEvent({
          event_type: 'day_of_reminder_sent',
          booking_id: booking.id,
          customer_phone: booking.phone,
          payload: { job_date: booking.job_date, job_time: booking.job_time },
        });
        sentCount++;
      } catch (err) {
        errors.push({ booking_id: booking.id, error: err.message });
      }
    }

    await cronFinished(cronName, { sent: sentCount, errors: errors.length });
    return NextResponse.json({
      ok: true,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await cronFailed('day-of-reminder', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
