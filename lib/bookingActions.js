import { supabaseAdmin } from './supabase';
import { calculateNoShowRisk } from './noshow';
import {
  sendConfirmationSMS,
  sendOperatorAlert,
  sendHeavyLoadAlerts,
  sendUpgradeRequest,
  sendBookingConfirmationEmail,
} from './messages';

// ============================================================
// POST-BOOKING CONFIRMED HANDLER — runs after deposit payment succeeds.
// Idempotent: guarded by confirmation_sms_sent so a webhook retry won't
// double-text the customer.
//
// Each notification is independent (audit B4/F3): a failure sending one
// (e.g. sendConfirmationSMS throwing on a suppressed number) used to abort
// every send after it AND still set confirmation_sms_sent=true beforehand,
// permanently losing the operator alert/email/heavy-load-flag/upgrade
// prompt with no way to retry. Now every send is caught independently, and
// the idempotency flag is only set once the customer-facing confirmation
// SMS itself actually succeeds -- that's the one send this flag must
// accurately gate, since re-running it is what would double-text the
// customer. If it failed, the flag stays false so a retry (the
// confirmation-sweep cron, or another call to this function) tries again;
// any other step that already succeeded may re-fire on that retry, which
// is a real but acceptable tradeoff against silently dropping it forever.
// ============================================================
export const handleBookingConfirmed = async (booking_id) => {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .single();

  if (!booking) throw new Error('Booking not found');
  if (booking.confirmation_sms_sent) return; // already processed

  // 1. No-show risk score
  const risk_score = await calculateNoShowRisk(booking);
  await supabaseAdmin
    .from('bookings')
    .update({ no_show_risk_score: risk_score })
    .eq('id', booking_id);

  const errors = [];
  const attempt = async (step, fn) => {
    try {
      await fn();
    } catch (err) {
      errors.push({ step, error: err.message });
    }
  };

  // 2 + 3. Customer confirmation SMS + operator alert + email
  await attempt('confirmation_sms', () => sendConfirmationSMS(booking));
  await attempt('operator_alert', () => sendOperatorAlert(booking));
  if (booking.email) {
    await attempt('confirmation_email', () => sendBookingConfirmationEmail(booking));
  }

  // 4. Heavy-load flag
  if (booking.flag_for_review) {
    await attempt('heavy_load_alert', () => sendHeavyLoadAlerts(booking));
  }

  // 5. Load-size upgrade prompt
  if (booking.upgrade_pending && booking.suggested_load_size) {
    await attempt('upgrade_request', () => sendUpgradeRequest(booking));
  }

  const smsFailed = errors.some((e) => e.step === 'confirmation_sms');
  if (!smsFailed) {
    await supabaseAdmin
      .from('bookings')
      .update({ confirmation_sms_sent: true })
      .eq('id', booking_id);
  }

  if (errors.length > 0) {
    console.error(`handleBookingConfirmed: ${errors.length} step(s) failed for booking ${booking_id}`, errors);
  }

  return { risk_score, errors };
};
