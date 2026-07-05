import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { notifyWaitlist } from './waitlist';
import { jobDateTimeUTC, formatDateLong, formatTime } from './dates';

// ============================================================
// RESCHEDULE HANDLER (Section 12) — max 2 reschedules per booking.
// ============================================================
export const rescheduleBooking = async (booking_id, new_date, new_time) => {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .single();

  if (!booking) throw new Error('Booking not found');

  if (booking.reschedule_count >= 2) {
    return {
      success: false,
      error: 'Maximum 2 reschedules per booking. Please cancel and rebook.',
    };
  }

  const { data: newSlot } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('slot_date', new_date)
    .eq('slot_time', new_time)
    .single();

  if (!newSlot || newSlot.jobs_booked >= newSlot.max_jobs) {
    return { success: false, error: 'That slot is not available.' };
  }

  const original_job_date =
    booking.reschedule_count === 0 ? booking.job_date : booking.original_job_date;
  const original_job_time =
    booking.reschedule_count === 0 ? booking.job_time : booking.original_job_time;

  const old_date = booking.job_date;
  const old_time = booking.job_time;

  await supabaseAdmin
    .from('bookings')
    .update({
      job_date: new_date,
      job_time: new_time,
      job_datetime: jobDateTimeUTC(new_date, new_time).toISOString(),
      status: 'confirmed',
      reschedule_count: booking.reschedule_count + 1,
      original_job_date,
      original_job_time,
    })
    .eq('id', booking_id);

  // Free old slot, fill new slot
  await supabaseAdmin.rpc('decrement_slot', { p_date: old_date, p_time: old_time });
  await supabaseAdmin.rpc('increment_slot', { p_date: new_date, p_time: new_time });

  // MSG 9 — reschedule confirmed
  await sendSMS(
    booking.phone,
    `✅ Booking ${booking.booking_ref} rescheduled!\n\nNew time: ${formatDateLong(new_date)} at ${formatTime(new_time)}\n📍 ${booking.address}\nBalance due: $${booking.balance_due}\n\njunkhaul.ca`,
    booking_id,
    'reschedule'
  );

  // A slot just freed up — notify waitlist.
  await notifyWaitlist(old_date, old_time);

  return { success: true };
};
