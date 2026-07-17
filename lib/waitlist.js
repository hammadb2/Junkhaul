import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { dayType, dayName, monthName, dayOfMonth, formatTime } from './dates';

// ============================================================
// WAITLIST — capture demand for full slots, convert on cancellations.
// ============================================================

// Called by cancelBooking() and rescheduleBooking() when a slot frees up.
export const notifyWaitlist = async (freed_date, freed_time) => {
  const type = dayType(freed_date);

  const { data: entry } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .or(`preferred_day_type.eq.${type},preferred_day_type.eq.either`)
    .eq('notified', false)
    .is('converted_to_booking_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!entry) return;

  // Mark notified with a 30-minute response window.
  await supabaseAdmin
    .from('waitlist')
    .update({
      notified: true,
      notified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .eq('id', entry.id);

  const body = `Good news ${entry.name}, a spot just opened up at Junk Haul Calgary!

${dayName(freed_date)} ${monthName(freed_date)} ${dayOfMonth(freed_date)} at ${formatTime(freed_time)} is now available.

Reply YES to grab it (you have 30 minutes, $50 deposit required to lock it in)
Or book at junkhaul.ca`;

  await sendSMS(entry.phone, body, null, 'waitlist');
};

// Add a customer to the waitlist and confirm via SMS.
export const addToWaitlist = async ({ name, phone, preferred_date, preferred_day_type, load_size, address, session_id = null }) => {
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .insert({ name, phone, preferred_date, preferred_day_type, load_size, address, session_id })
    .select()
    .single();
  if (error) throw error;

  await sendSMS(
    phone,
    `You're on the Junk Haul Calgary waitlist! We'll text you the moment a ${preferred_day_type === 'either' ? 'Sunday' : preferred_day_type} spot opens up.`,
    { message_type: 'waitlist_confirm', workflow_action: 'waitlist_join' }
  );

  return data;
};
