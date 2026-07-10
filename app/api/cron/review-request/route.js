import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed, logEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// ============================================================
// REVIEW REQUEST CRON
// Runs hourly. Catches any completed+paid bookings that didn't
// get a review request at completion time (edge cases where the
// complete-job or collect-payment SMS failed).
//
// Sends the review request at the highest-goodwill moment:
// right after the job is done and payment cleared.
// ============================================================

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'review-request';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn('review_request'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('status', 'completed')
      .eq('review_requested', false)
      .neq('payment_status', 'unpaid')
      .gt('updated_at', oneDayAgo);

    let sentCount = 0;
    for (const booking of bookings || []) {
      try {
        // Prefer the tracking token link so the customer can track
        // their junk, leave feedback, and tip the crew in one place.
        const trackingId = booking.tracking_token || booking.id;
        const trackingUrl = `https://junkhaul.ca/track/${trackingId}`;
        const reviewMsg = `Your junk removal is complete! Track where your items went, leave feedback, and tip your crew: ${trackingUrl}`;
        await sendSMS(booking.phone, reviewMsg, booking.id, 'review_request');
        await supabaseAdmin
          .from('bookings')
          .update({
            review_requested: true,
            review_requested_at: new Date().toISOString(),
          })
          .eq('id', booking.id);
        await logEvent({
          event_type: 'review_request_sent',
          booking_id: booking.id,
          customer_phone: booking.phone,
          payload: { triggered_by: 'cron' },
        });
        sentCount++;
      } catch (err) {
        console.error('Review request failed for booking', booking.id, err);
      }
    }

    await cronFinished(cronName, { sent: sentCount });
    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (error) {
    await cronFailed('review-request', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
