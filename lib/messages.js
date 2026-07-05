import { sendSMS } from './sms';
import { LOAD_LABELS } from './pricing';
import { formatTime, formatDateLong, dayName, monthName, dayOfMonth } from './dates';

// ============================================================
// SMS message builders + senders (exact copy per the brief, Section 10).
// ============================================================

const SITE = 'junkhaul.ca';

// MSG 1 — booking confirmation (to customer)
export const sendConfirmationSMS = async (booking) => {
  const body = `✅ Junk Haul Calgary — You're booked!

Ref: ${booking.booking_ref}
📅 ${dayName(booking.job_date)}, ${monthName(booking.job_date)} ${dayOfMonth(booking.job_date)} at ${formatTime(booking.job_time)}
📍 ${booking.address}

💰 Total: $${booking.total_price}
✅ Deposit paid: $50
💳 Balance on day: $${booking.balance_due}

We'll text you the morning of your pickup.
Questions? Reply to this message.

${SITE}`;
  await sendSMS(booking.phone, body, booking.id, 'confirmation');
  return body;
};

// MSG 2 — operator alert (to Hammad)
export const sendOperatorAlert = async (booking) => {
  let extras = '';
  if (booking.photo_skipped) extras += `\n⚠️ NO PHOTOS — confirm load on arrival`;
  if (booking.flag_for_review)
    extras += `\n🚨 HEAVY LOAD: ${booking.flag_reason || 'review'} — call customer`;
  if (booking.has_freon) extras += `\n🌡️ Freon appliance — bring straps`;

  const body = `🚛 NEW BOOKING — ${booking.booking_ref}

📅 ${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}
📍 ${booking.address}
👤 ${booking.name}
📞 ${booking.phone}
📦 ${LOAD_LABELS[booking.load_size]} — $${booking.total_price}
Source: ${booking.source}${extras}

${SITE}/admin`;
  await sendSMS(process.env.HAMMAD_PHONE, body, booking.id, 'operator_alert');
};

// MSG 11 + 12 — heavy load flag (Hammad) + customer notification
export const sendHeavyLoadAlerts = async (booking) => {
  const hammadBody = `🚨 HEAVY LOAD FLAG — ${booking.booking_ref}

${booking.name} | ${booking.phone}
${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}
${booking.address}
${LOAD_LABELS[booking.load_size]} — $${booking.total_price}

Reason: ${booking.flag_reason || 'AI flagged heavy load'}

Call customer before their pickup date to confirm.`;
  await sendSMS(process.env.HAMMAD_PHONE, hammadBody, booking.id, 'heavy_load_operator');

  const custBody = `Hi ${booking.name} — Junk Haul Calgary here (Ref: ${booking.booking_ref})

Your job looks like a big one. Hammad will call you in the next 15 minutes to confirm details before your ${formatDateLong(booking.job_date)} pickup.

Talk soon!
${SITE}`;
  await sendSMS(booking.phone, custBody, booking.id, 'heavy_load_customer');
};

// MSG 10 — load upgrade request
export const sendUpgradeRequest = async (booking) => {
  const priceDiff = (booking.suggested_price || 0) - booking.total_price;
  const body = `Hi ${booking.name} — Junk Haul Calgary here (Ref: ${booking.booking_ref})

Your photos suggest your load might be larger than selected.

Your booking: ${LOAD_LABELS[booking.load_size]} ($${booking.total_price})
Our estimate: ${LOAD_LABELS[booking.suggested_load_size]} ($${booking.suggested_price})

Upgrade to avoid extra charges on the day?

Reply YES to upgrade (we'll charge $${priceDiff} more)
Reply NO to keep current booking

${SITE}`;
  await sendSMS(booking.phone, body, booking.id, 'upgrade');
};

// MSG 17 — deposit link (for phone bookings via Vapi)
export const sendDepositLink = async (booking) => {
  const body = `Hi ${booking.name}! Your Junk Haul Calgary booking is confirmed for ${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}.

Pay your $50 deposit here to lock it in:
${SITE}/pay/${booking.id}

Ref: ${booking.booking_ref}
Without payment, your slot may be released.`;
  await sendSMS(booking.phone, body, booking.id, 'deposit_link');
};
