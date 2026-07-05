import { supabaseAdmin } from './supabase';
import { calculatePrice, LOAD_LABELS, PRICING } from './pricing';
import { geocodeAddress } from './geocode';
import { jobDateTimeUTC, formatTime, formatDateLong, dayType } from './dates';
import { sendDepositLink } from './messages';
import { cancelBooking } from './cancellations';
import { rescheduleBooking } from './reschedule';
import { addToWaitlist } from './waitlist';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';

// ============================================================
// Vapi voice-agent tool implementations. Each returns a plain string the
// agent can read back to the caller.
// ============================================================
export const vapiTools = {
  // 1 — availability for a day type or specific date
  async check_availability({ date, day_type }) {
    const today = new Date().toISOString().slice(0, 10);
    let q = supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('is_available', true)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
    if (date) q = q.eq('slot_date', date);
    if (day_type) q = q.eq('day_type', day_type);
    const { data } = await q.limit(12);
    const open = (data || []).filter((s) => s.jobs_booked < s.max_jobs);
    if (open.length === 0) return 'There are no open slots right now. I can add you to the waitlist.';
    const grouped = {};
    for (const s of open) {
      grouped[s.slot_date] = grouped[s.slot_date] || [];
      grouped[s.slot_date].push(formatTime(s.slot_time));
    }
    return Object.entries(grouped)
      .map(([d, times]) => `${formatDateLong(d)}: ${times.join(', ')}`)
      .join('. ');
  },

  // 2 — price quote
  async get_quote({ load_size, same_day = false, stairs = 0, has_freon = false, freon_count = 0 }) {
    if (!PRICING.loads[load_size]) return 'I need a valid load size: single item, quarter, half, or full.';
    const p = calculatePrice({ load_size, same_day, stairs, has_freon, freon_count });
    let breakdown = `A ${LOAD_LABELS[load_size]} is $${p.total} total. That's a $50 deposit to book, and $${p.balance_due} due on pickup day.`;
    if (has_freon && freon_count > 1) breakdown += ` Freon charge is $${PRICING.freon_per_item} per appliance, so ${freon_count} appliances adds $${p.freon_fee}.`;
    return breakdown;
  },

  // 3 — create a booking (deposit paid via link)
  async create_booking({ name, phone, address, load_size, job_date, job_time, same_day = false, stairs = 0, has_freon = false, freon_count = 0 }) {
    if (!name || !phone || !address || !load_size || !job_date || !job_time) {
      return 'I still need a few details before I can book that.';
    }
    const { data: slot } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('slot_date', job_date)
      .eq('slot_time', job_time)
      .maybeSingle();
    if (!slot || slot.jobs_booked >= slot.max_jobs) {
      return 'That time just filled up. Would you like a different slot?';
    }

    const priced = calculatePrice({ load_size, same_day, stairs, has_freon, freon_count, job_date, job_time });
    const geo = await geocodeAddress(address);

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        name,
        phone,
        address,
        quadrant: geo.quadrant,
        lat: geo.lat,
        lng: geo.lng,
        load_size,
        base_price: priced.base_price,
        same_day,
        same_day_fee: priced.same_day_fee,
        stairs,
        stairs_fee: priced.stairs_fee,
        has_freon,
        freon_count: priced.freon_count,
        freon_fee: priced.freon_fee,
        total_price: priced.total,
        deposit_amount: PRICING.deposit,
        balance_due: priced.balance_due,
        job_date,
        job_time,
        job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
        photo_skipped: true,
        source: 'vapi',
        status: 'pending_payment',
      })
      .select()
      .single();

    if (error) return 'Something went wrong creating the booking. Let me try again.';

    await sendDepositLink(booking);
    return `Booked! Your reference is ${booking.booking_ref} for ${formatDateLong(job_date)} at ${formatTime(job_time)}. I've texted a link to ${phone} to pay the $50 deposit and lock in your slot.`;
  },

  // 4 — look up an existing booking
  async lookup_booking({ booking_ref, phone }) {
    let q = supabaseAdmin.from('bookings').select('*');
    if (booking_ref) q = q.eq('booking_ref', booking_ref.toUpperCase());
    else if (phone) q = q.eq('phone', phone).order('created_at', { ascending: false });
    else return 'I need a booking reference or the phone number on the booking.';
    const { data } = await q.limit(1).maybeSingle();
    if (!data) return "I couldn't find a booking with those details.";
    return `Booking ${data.booking_ref}: ${LOAD_LABELS[data.load_size]} on ${formatDateLong(data.job_date)} at ${formatTime(data.job_time)}, status ${data.status}. Total $${data.total_price}, balance due $${data.balance_due}.`;
  },

  // 5 — cancel
  async cancel_booking({ booking_ref }) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!data) return "I couldn't find that booking to cancel.";
    try {
      const res = await cancelBooking(data.id, 'Cancelled via phone', 'customer');
      return res.policy.deposit_refunded
        ? 'Done — your booking is cancelled and your $50 deposit will be refunded.'
        : 'Your booking is cancelled. Since it is within 24 hours, the $50 deposit is non-refundable.';
    } catch (e) {
      return 'I ran into a problem cancelling that. A team member will follow up.';
    }
  },

  // 6 — reschedule
  async reschedule_booking({ booking_ref, new_date, new_time }) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!data) return "I couldn't find that booking.";
    const res = await rescheduleBooking(data.id, new_date, new_time);
    return res.success
      ? `All set — moved to ${formatDateLong(new_date)} at ${formatTime(new_time)}.`
      : res.error;
  },

  // 7 — waitlist
  async add_to_waitlist({ name, phone, preferred_day_type = 'either', load_size, address }) {
    if (!name || !phone) return 'I need your name and number to add you to the waitlist.';
    await addToWaitlist({ name, phone, preferred_day_type, load_size, address });
    return `You're on the waitlist, ${name}. We'll text ${phone} the moment a spot opens up.`;
  },
};

export const runVapiTool = async (name, args) => {
  const fn = vapiTools[name];
  if (!fn) return `Unknown tool: ${name}`;
  try {
    return await fn(args || {});
  } catch (e) {
    console.error(`Vapi tool ${name} failed:`, e);
    return 'Sorry, something went wrong on our end. A team member will follow up.';
  }
};
