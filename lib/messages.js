import { sendSMS } from './sms';
import { LOAD_LABELS } from './pricing';
import { formatTime, formatDateLong, dayName, monthName, dayOfMonth } from './dates';

// ============================================================
// SMS message builders. Written to sound like a real person
// texting, not a robot. No em dashes, no weird formatting.
// ============================================================

const SITE = 'junkhaul.ca';

// MSG 1 — booking confirmation (to customer)
export const sendConfirmationSMS = async (booking) => {
  const body = `You're booked with Junk Haul Calgary!

Ref: ${booking.booking_ref}
${dayName(booking.job_date)}, ${monthName(booking.job_date)} ${dayOfMonth(booking.job_date)} at ${formatTime(booking.job_time)}
${booking.address}

Total: $${booking.total_price}
Deposit paid: $50
Balance due on pickup: $${booking.balance_due}

We'll text you the morning of your pickup. Reply to this text if you have questions.

${SITE}`;
  await sendSMS(booking.phone, body, booking.id, 'confirmation');
  return body;
};

// MSG 2 — operator alert (to Hammad)
export const sendOperatorAlert = async (booking) => {
  let extras = '';
  if (booking.photo_skipped) extras += '\nNo photos, confirm load on arrival';
  if (booking.flag_for_review) extras += `\nHEAVY LOAD: ${booking.flag_reason || 'review'}, call customer`;
  if (booking.has_freon) extras += `\nFreon appliance(s), bring straps`;

  const body = `New booking ${booking.booking_ref}

${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}
${booking.address}
${booking.name} | ${booking.phone}
${LOAD_LABELS[booking.load_size]} | $${booking.total_price}
Source: ${booking.source}${extras}

${SITE}/admin`;
  await sendSMS(process.env.HAMMAD_PHONE, body, booking.id, 'operator_alert');
};

// MSG 11 + 12 — heavy load flag (Hammad + customer)
export const sendHeavyLoadAlerts = async (booking) => {
  const hammadBody = `Heavy load flag on ${booking.booking_ref}

${booking.name} | ${booking.phone}
${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}
${booking.address}
${LOAD_LABELS[booking.load_size]} | $${booking.total_price}

Reason: ${booking.flag_reason || 'AI flagged heavy load'}

Call the customer before pickup to confirm details.`;
  await sendSMS(process.env.HAMMAD_PHONE, hammadBody, booking.id, 'heavy_load_operator');

  const custBody = `Hi ${booking.name}, it's Junk Haul Calgary (Ref: ${booking.booking_ref}).

Your job looks like a big one. Hammad will give you a quick call in the next 15 minutes to confirm the details before your ${formatDateLong(booking.job_date)} pickup.

Talk soon!
${SITE}`;
  await sendSMS(booking.phone, custBody, booking.id, 'heavy_load_customer');
};

// MSG 10 — load upgrade request
export const sendUpgradeRequest = async (booking) => {
  const priceDiff = (booking.suggested_price || 0) - booking.total_price;
  const body = `Hi ${booking.name}, Junk Haul Calgary here (Ref: ${booking.booking_ref}).

Looking at your photos, your load might be bigger than what you booked.

Your booking: ${LOAD_LABELS[booking.load_size]} ($${booking.total_price})
Our estimate: ${LOAD_LABELS[booking.suggested_load_size]} ($${booking.suggested_price})

Want to upgrade so there are no surprises on pickup day?

Reply YES to upgrade ($${priceDiff} more on your balance)
Reply NO to keep your current booking

${SITE}`;
  await sendSMS(booking.phone, body, booking.id, 'upgrade');
};

// MSG 17 — deposit link (for phone bookings via Vapi)
export const sendDepositLink = async (booking) => {
  const body = `Hi ${booking.name}! Your Junk Haul Calgary pickup is set for ${formatDateLong(booking.job_date)} at ${formatTime(booking.job_time)}.

Pay your $50 deposit here to lock it in:
${SITE}/pay/${booking.id}

Ref: ${booking.booking_ref}
Your slot is held for 2 hours. If we don't get payment by then, we may release it.`;
  await sendSMS(booking.phone, body, booking.id, 'deposit_link');
};
