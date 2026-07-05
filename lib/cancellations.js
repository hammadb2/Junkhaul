import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { stripe } from './stripe';
import { notifyWaitlist } from './waitlist';
import { jobDateTimeUTC, formatDateLong, formatTime } from './dates';

// ============================================================
// CANCELLATION POLICY (Section 11)
// ============================================================
export const CANCELLATION_POLICY = {
  over_24_hours: {
    deposit_refunded: true,
    refund_amount: 50,
    message_type: 'full_refund',
    label: 'Full refund',
  },
  under_24_hours: {
    deposit_refunded: false,
    refund_amount: 0,
    message_type: 'deposit_kept',
    label: 'Deposit non-refundable',
  },
  under_2_hours: {
    deposit_refunded: false,
    refund_amount: 0,
    message_type: 'deposit_kept',
    label: 'Late cancellation — deposit kept',
    note: 'If truck is already en route, 25% of total may apply',
  },
  no_show: {
    deposit_refunded: false,
    refund_amount: 0,
    message_type: 'deposit_kept',
    label: 'No-show — deposit kept',
  },
  operator_cancellation: {
    deposit_refunded: true,
    refund_amount: 50,
    message_type: 'full_refund',
    label: 'Operator cancelled — full refund',
    priority_rebook: true,
  },
};

export const cancelBooking = async (booking_id, reason, cancelled_by) => {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .single();

  if (!booking) throw new Error('Booking not found');
  if (booking.status === 'cancelled') throw new Error('Already cancelled');
  if (booking.status === 'completed') throw new Error('Cannot cancel completed job');

  const jobDatetime = jobDateTimeUTC(booking.job_date, booking.job_time);
  const hoursUntilJob = (jobDatetime - new Date()) / 3600000;

  let policy;
  if (cancelled_by === 'operator') policy = CANCELLATION_POLICY.operator_cancellation;
  else if (hoursUntilJob > 24) policy = CANCELLATION_POLICY.over_24_hours;
  else if (hoursUntilJob > 2) policy = CANCELLATION_POLICY.under_24_hours;
  else if (hoursUntilJob > 0) policy = CANCELLATION_POLICY.under_2_hours;
  else policy = CANCELLATION_POLICY.no_show;

  // Process Stripe refund if applicable
  let stripe_refund_id = null;
  if (policy.deposit_refunded && booking.stripe_payment_intent_id && booking.deposit_paid) {
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: policy.refund_amount * 100,
    });
    stripe_refund_id = refund.id;
  }

  await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by,
      cancelled_at: new Date().toISOString(),
      refund_amount: policy.refund_amount,
      refund_processed: policy.deposit_refunded,
      refund_stripe_id: stripe_refund_id,
    })
    .eq('id', booking_id);

  // Free the time slot
  await supabaseAdmin.rpc('decrement_slot', {
    p_date: booking.job_date,
    p_time: booking.job_time,
  });

  // Customer SMS (MSG 6 or 7)
  const customerMessage = policy.deposit_refunded
    ? `Booking ${booking.booking_ref} cancelled.\n\n💰 Full $50 refund processing within 5-10 business days to your card.\n\nWant to rebook? junkhaul.ca`
    : `Booking ${booking.booking_ref} cancelled.\n\n⚠️ Per our policy, the $50 deposit is non-refundable for cancellations within 24 hours of your scheduled pickup.\n\nWant to rebook? junkhaul.ca`;
  await sendSMS(booking.phone, customerMessage, booking_id, 'cancellation');

  // Operator alert (MSG 8)
  await sendSMS(
    process.env.HAMMAD_PHONE,
    `❌ CANCELLATION — ${booking.booking_ref}\n\n${booking.name} cancelled their ${formatDateLong(booking.job_date)} ${formatTime(booking.job_time)} job.\nReason: ${reason}\nRefund: ${policy.deposit_refunded ? '$' + policy.refund_amount + ' refunded' : 'Deposit kept'}\n\nSlot freed: ${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}`,
    booking_id,
    'operator_cancellation'
  );

  // Check waitlist for the freed slot
  await notifyWaitlist(booking.job_date, booking.job_time);

  return { success: true, policy };
};
