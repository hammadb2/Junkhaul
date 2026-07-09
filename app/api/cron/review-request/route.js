import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';

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
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find completed bookings with payment that haven't had a review requested
  // and were completed within the last 24 hours (don't review old jobs)
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
      const reviewMsg = `Thanks for choosing Junk Haul Calgary, ${booking.name}! We'd love to hear how we did. Leave a quick review: https://junkhaul.ca/review/${booking.id} — it takes 30 seconds and helps us a ton.`;
      await sendSMS(booking.phone, reviewMsg, booking.id, 'review_request');
      await supabaseAdmin
        .from('bookings')
        .update({
          review_requested: true,
          review_requested_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      sentCount++;
    } catch (err) {
      console.error('Review request failed for booking', booking.id, err);
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount });
}
