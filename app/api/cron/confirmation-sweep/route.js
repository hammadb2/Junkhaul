import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { handleBookingConfirmed } from '@/lib/bookingActions';
import { checkCronSecret } from '@/lib/cronAuth';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed } from '@/lib/audit';

export const runtime = 'nodejs';

// ============================================================
// CONFIRMATION SWEEP CRON (audit F3)
// Runs every 15 minutes. Stripe webhook processing always returns
// HTTP 200 even when an internal step throws (deliberately, so
// Stripe doesn't hammer retries for our own bugs -- see
// stripe-webhook/route.js) -- which means Stripe never re-delivers
// a payment_intent.succeeded event just because our confirmation
// SMS/operator alert/email failed partway through. Combined with
// handleBookingConfirmed's confirmation_sms_sent guard, a booking
// whose confirmation flow failed once had no path back: deposit_paid
// was already true, and nothing else ever called
// handleBookingConfirmed for it again.
//
// This sweep is that path: any booking with deposit_paid=true,
// confirmation_sms_sent=false, and not cancelled gets
// handleBookingConfirmed retried. The 5-minute floor avoids racing
// the webhook that's still actively processing the same booking.
// ============================================================

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cronName = 'confirmation-sweep';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn('confirmation_sweep'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('deposit_paid', true)
      .eq('confirmation_sms_sent', false)
      .neq('status', 'cancelled')
      .lt('deposit_paid_at', fiveMinAgo);

    let recovered = 0;
    let stillFailing = 0;
    for (const booking of bookings || []) {
      try {
        const result = await handleBookingConfirmed(booking.id);
        if (result?.errors?.length > 0) {
          stillFailing++;
        } else {
          recovered++;
        }
      } catch (err) {
        stillFailing++;
        console.error('confirmation-sweep: retry failed for booking', booking.id, err.message);
      }
    }

    await cronFinished(cronName, { checked: bookings?.length || 0, recovered, stillFailing });
    return NextResponse.json({ ok: true, checked: bookings?.length || 0, recovered, stillFailing });
  } catch (error) {
    await cronFailed('confirmation-sweep', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
