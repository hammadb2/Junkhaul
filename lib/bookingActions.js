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
    .update({ no_show_risk_score: risk_score, confirmation_sms_sent: true })
    .eq('id', booking_id);

  // 2 + 3. Customer confirmation SMS + operator alert + email
  await sendConfirmationSMS(booking);
  await sendOperatorAlert(booking);
  if (booking.email) {
    await sendBookingConfirmationEmail(booking);
  }

  // 4. Heavy-load flag
  if (booking.flag_for_review) {
    await sendHeavyLoadAlerts(booking);
  }

  // 5. Load-size upgrade prompt
  if (booking.upgrade_pending && booking.suggested_load_size) {
    await sendUpgradeRequest(booking);
  }

  return { risk_score };
};
