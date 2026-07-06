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
  if (booking.stairs > 0) extras += `\nStairs: ${booking.stairs} flight(s)`;
  if (booking.is_apartment) extras += `\nApartment/condo — unit: ${booking.unit || 'not provided'}`;
  if (booking.customer_notes) extras += `\nCUSTOMER NOTES: ${booking.customer_notes}`;

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

// Email — branded booking confirmation (sent if customer provides email)
export const sendBookingConfirmationEmail = async (booking) => {
  if (!booking.email) return;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const subject = `Booking confirmed — ${booking.booking_ref}`;
  const body = `Hi ${booking.name},

Your junk pickup is booked! Here are your details.

**Booking reference:** ${booking.booking_ref}
**Date:** ${formatDateLong(booking.job_date)}
**Time:** ${formatTime(booking.job_time)}
**Address:** ${booking.address}
**Load size:** ${LOAD_LABELS[booking.load_size]}

**Pricing:**
Base price: $${booking.base_price}
${booking.stairs_fee > 0 ? `Stairs (${booking.stairs} flight(s)): $${booking.stairs_fee}\n` : ''}${booking.same_day_fee > 0 ? `Same-day rush: $${booking.same_day_fee}\n` : ''}${booking.freon_fee > 0 ? `Freon: $${booking.freon_fee}\n` : ''}Deposit paid: $${booking.deposit_amount}
Balance due on pickup: $${booking.balance_due}
**Total: $${booking.total_price}**

${booking.customer_notes ? `**Your notes:** ${booking.customer_notes}\n` : ''}You will get a text reminder the morning of your pickup. Our crew will call you when they are 15 minutes away.

Questions? Just reply to this email or call us at (587) 325-0751.

Thanks for choosing Junk Haul Calgary!`;

  // Build branded HTML
  const bodyHTML = body
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:#ffffff;padding:28px 32px 20px;text-align:center;border-bottom:3px solid #f97316;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="72" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;">${subject}</p>
</td></tr>
<tr><td style="padding:0 32px 8px;">
${bodyHTML}
</td></tr>
<tr><td style="padding:8px 32px 24px;">
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#f97316;border-radius:10px;">
<a href="https://junkhaul.ca" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Visit junkhaul.ca</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 32px;">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:100%;border-top:1px solid #eeeeee;padding-top:20px;">
<tr><td style="padding-bottom:14px;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="56" style="display:block;" />
</td></tr>
<tr><td style="border-top:3px solid #f97316;padding-top:14px;">
<p style="margin:0 0 2px;font-size:17px;font-weight:bold;color:#1a1a1a;">Sales Department</p>
<p style="margin:0 0 12px;font-size:13px;color:#888888;">Calgary, AB</p>
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:14px;"><a href="tel:+15873250751" style="font-size:13px;color:#f97316;text-decoration:none;font-weight:600;">(587) 325-0751</a></td>
<td style="color:#ddd;padding-right:14px;font-size:13px;">|</td>
<td><a href="https://junkhaul.ca" style="font-size:13px;color:#f97316;text-decoration:none;font-weight:600;">junkhaul.ca</a></td>
</tr></table>
<p style="margin:10px 0 0;font-size:11px;color:#aaaaaa;">&#10003; Fully Licensed &amp; Insured &nbsp;|&nbsp; &#127464;&#127462; Canadian Owned &amp; Operated &nbsp;|&nbsp; Calgary, AB</p>
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Junk Haul Calgary <support@junkhaul.ca>',
        reply_to: 'contact@junkhaul.ca',
        to: booking.email,
        subject,
        html,
        text: body,
      }),
    });
  } catch (e) {
    console.error('Confirmation email failed:', e);
  }
};
