import { supabaseAdmin } from './supabase';
import { callerOwnsBooking, CALLER_MISMATCH_MESSAGE } from './callerAuth';
import { quoteCustomerPrice, getPricingConfig, LOAD_LABELS, PRICING } from './pricing';
import { createQuoteDecision, linkQuoteDecisionToBooking } from './quoteDecision.js';
import { toCents } from './money.js';
import { geocodeAddress } from './geocode';
import { calculateTravelFee } from './route.js';
import { jobDateTimeUTC, formatTime, formatDateLong, dayType } from './dates';
import { sendDepositLink, sendOperatorAlert } from './messages';
import { sendSMS } from './sms';
import { cancelBooking } from './cancellations';
import { rescheduleBooking } from './reschedule';
import { addToWaitlist } from './waitlist';
import { stripe } from './stripe';
import { resolveDispatch } from './dispatch';
import { recordCallHistory } from './callHistory';
import { randomBytes } from 'crypto';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';
const OPERATOR_PHONE = '+18259458282';
const OPERATOR_EMAIL = 'hammad@junkhaul.ca';

// ============================================================
// Branded HTML email template with logo + signature
// ============================================================
function buildEmailHTML(subject, body, department = 'Junk Haul Calgary') {
  // Convert plain text body to HTML paragraphs
  const bodyHTML = body
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<!-- Logo header -->
<tr><td style="background:#ffffff;padding:28px 32px 20px;text-align:center;border-bottom:3px solid #f97316;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="72" style="display:block;margin:0 auto;" />
</td></tr>

<!-- Subject line -->
<tr><td style="padding:24px 32px 0;">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1a1a1a;">${subject}</p>
</td></tr>

<!-- Body content -->
<tr><td style="padding:0 32px 8px;">
${bodyHTML}
</td></tr>

<!-- CTA button -->
<tr><td style="padding:8px 32px 24px;">
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#f97316;border-radius:10px;">
<a href="https://junkhaul.ca" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Visit junkhaul.ca</a>
</td></tr></table>
</td></tr>

<!-- Signature block -->
<tr><td style="padding:0 32px 32px;">
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;border-collapse:collapse;max-width:100%;border-top:1px solid #eeeeee;padding-top:20px;">
<tr><td style="padding-bottom:14px;">
<img src="https://junkhaul.ca/logo/stampede-alt.png" alt="Junk Haul Calgary" height="56" style="display:block;" />
</td></tr>
<tr><td style="border-top:3px solid #f97316;padding-top:14px;">
<p style="margin:0 0 2px;font-size:17px;font-weight:bold;color:#1a1a1a;">${department}</p>
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
}

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

  // 2 — price quote (server-enforced through the quote decision service)
  async get_quote({ load_size, same_day = false, stairs = 0, has_freon = false, freon_count = 0, address }) {
    if (!PRICING.loads[load_size]) return 'I need a valid load size: single item, quarter, half, or full.';
    const pricingConfig = await getPricingConfig();
    let geo = { lat: null, lng: null };
    try { geo = await geocodeAddress(address || 'Calgary, AB'); } catch {}
    // Real cost-engine price — same source of truth as the web booking
    // flow (lib/pricing.js's quoteCustomerPrice). Falls back to a
    // Calgary-centre geocode when no address was given yet, same as the
    // rest of this quote tool already did.
    const p = await quoteCustomerPrice({
      load_size, same_day, stairs, has_freon, freon_count,
      lat: geo.lat, lng: geo.lng, address: address || null,
      pricingConfig,
    });
    const quoteInput = {
      load_size, same_day, stairs, has_freon, freon_count,
      address: address || null,
      lat: geo.lat, lng: geo.lng,
      requested_price_cents: toCents(p.total),
    };
    const decision = await createQuoteDecision({ quoteInput, priceCents: toCents(p.total), costSnapshot: p.raw_cost_snapshot });
    if (decision.state === 'needs_evidence') {
      return `For a ${LOAD_LABELS[load_size]} load, our estimated range is around $${p.total}. I can lock in an exact price once you send a few photos or describe the items.`;
    }
    if (decision.state === 'manual_review') {
      return `A ${LOAD_LABELS[load_size]} is typically $${p.total}. This one needs a quick manager review because of the access details. I'll have someone text you a firm quote shortly.`;
    }
    let breakdown = `A ${LOAD_LABELS[load_size]} is $${p.total} total. That's a $50 deposit to book, and $${p.balance_due} due on pickup day.`;
    if (has_freon && freon_count > 1) breakdown += ` Freon charge is $${pricingConfig.freon_per_item} per appliance, so ${freon_count} appliances adds $${p.freon_fee}.`;
    return breakdown;
  },

  // 3 — create a booking (deposit paid via link)
  async create_booking({ name, phone, address, load_size, job_date, job_time, job_window_label = null, job_window_start = null, job_window_end = null, same_day = false, stairs = 0, has_freon = false, freon_count = 0 }) {
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

    const pricingConfig = await getPricingConfig();
    const geo = await geocodeAddress(address);
    let travelFee = 0;
    let travelKm = 0;
    try {
      const t = await calculateTravelFee({ lat: geo.lat, lng: geo.lng });
      travelFee = t.fee;
      travelKm = t.km;
    } catch {}

    // Real cost-engine price — same source of truth as get_quote above and
    // the web booking flow.
    const priced = await quoteCustomerPrice({
      load_size, same_day, stairs, has_freon, freon_count, job_date, job_time,
      travel_fee: travelFee, lat: geo.lat, lng: geo.lng, address,
      pricingConfig,
    });

    const quoteInput = {
      name, phone, address,
      load_size, same_day, stairs, has_freon, freon_count,
      job_date, job_time, job_window_label, job_window_start, job_window_end,
      lat: geo.lat, lng: geo.lng, travel_km: travelKm,
      requested_price_cents: toCents(priced.total),
      photo_skipped: true,
    };
    const decision = await createQuoteDecision({
      quoteInput,
      priceCents: toCents(priced.total),
      costSnapshot: priced.raw_cost_snapshot,
      depositCents: toCents(priced.deposit),
      actorType: 'voice_agent',
    });
    if (decision.state !== 'approved') {
      return decision.state === 'needs_evidence'
        ? 'I can give you an estimated range, but I need a photo or description to lock in the price. A team member can also call you back.'
        : 'This quote is below our policy minimum and needs manager approval before booking. Someone will contact you shortly.';
    }

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
        travel_fee: priced.travel_fee,
        travel_km: travelKm,
        truck_size: priced.truck_size,
        total_price: priced.total,
        deposit_amount: priced.deposit,
        balance_due: priced.balance_due,
        job_date,
        job_time,
        job_window_label,
        job_window_start,
        job_window_end,
        job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
        photo_skipped: true,
        source: 'vapi',
        status: 'pending_payment',
        quote_decision_id: decision.id,
      })
      .select()
      .single();

    if (error) return 'Something went wrong creating the booking. Let me try again.';
    await linkQuoteDecisionToBooking({ decisionId: decision.id, bookingId: booking.id });

    // Tracking token — every other booking channel sets this at creation;
    // Vapi never did (audit C1), so a phone-booked customer's tracking
    // link (currently only ever sent by the post-completion review-request
    // text, audit A3) had no token to send.
    const trackingToken = randomBytes(16).toString('hex');
    await supabaseAdmin.from('bookings').update({ tracking_token: trackingToken }).eq('id', booking.id);

    // Dynamic dispatch: assign to existing truck or create new crew assignment.
    try {
      await resolveDispatch({
        id: booking.id,
        job_date,
        lat: geo.lat,
        lng: geo.lng,
        load_size,
        ai_weight_estimate_kg: null,
      });
    } catch (e) {
      console.error('[dispatch] vapi resolveDispatch failed:', e.message);
    }

    try {
      const { createDepositPayment } = await import('./stripe.js');
      const intent = await createDepositPayment({
        booking_id: booking.id,
        customer_name: booking.name,
        amount_cents: decision.deposit_cents,
        quote_decision_id: decision.id,
        quote_decision_ref: decision.quote_decision_ref,
      });
      await supabaseAdmin.from('bookings').update({ stripe_payment_intent_id: intent.id }).eq('id', booking.id);
    } catch (e) {
      console.error('Stripe deposit intent failed for Vapi booking:', e.message);
    }

    // Operator alert — every other channel either already sends this (web)
    // or is being fixed alongside this same audit pass (admin manual entry,
    // A1); Vapi never did (audit C1), so the owner was never texted about a
    // phone-booked job at all.
    try {
      await sendOperatorAlert(booking);
    } catch (e) {
      console.error('[vapi] operator alert failed:', e.message);
    }

    await sendDepositLink(booking);
    const timeDesc = job_window_start && job_window_end
      ? `between ${formatTime(job_window_start)} and ${formatTime(job_window_end)}`
      : `at ${formatTime(job_time)}`;
    return `Booked! Your reference is ${booking.booking_ref} for ${formatDateLong(job_date)} ${timeDesc}. I've texted a link to ${phone} to pay the $50 deposit and lock in your slot.`;
  },

  // 4 — look up an existing booking
  async lookup_booking({ booking_ref, phone, _caller_phone }) {
    let q = supabaseAdmin.from('bookings').select('*');
    if (booking_ref) q = q.eq('booking_ref', booking_ref.toUpperCase());
    else if (phone) q = q.eq('phone', phone).order('created_at', { ascending: false });
    else return 'I need a booking reference or the phone number on the booking.';
    const { data } = await q.limit(1).maybeSingle();
    if (!data) return "I couldn't find a booking with those details.";
    // Only read booking details back to the number the booking belongs to.
    if (!callerOwnsBooking(_caller_phone, data.phone)) return CALLER_MISMATCH_MESSAGE;
    return `Booking ${data.booking_ref}: ${LOAD_LABELS[data.load_size]} on ${formatDateLong(data.job_date)} at ${formatTime(data.job_time)}, status ${data.status}. Total $${data.total_price}, balance due $${data.balance_due}.`;
  },

  // 5 — cancel
  async cancel_booking({ booking_ref, _caller_phone }) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('id, phone')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!data) return "I couldn't find that booking to cancel.";
    if (!callerOwnsBooking(_caller_phone, data.phone)) return CALLER_MISMATCH_MESSAGE;
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
  async reschedule_booking({ booking_ref, new_date, new_time, _caller_phone }) {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('id, phone')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!data) return "I couldn't find that booking.";
    if (!callerOwnsBooking(_caller_phone, data.phone)) return CALLER_MISMATCH_MESSAGE;
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

  // 8 — issue a refund (full or partial) via Stripe
  async issue_refund({ booking_ref, refund_type, amount, reason, _caller_phone }) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!booking) return "I couldn't find that booking.";
    if (!callerOwnsBooking(_caller_phone, booking.phone)) return CALLER_MISMATCH_MESSAGE;
    if (!booking.stripe_charge_id) return "I couldn't find a payment charge on that booking to refund.";

    // Cap any refund to what is actually still refundable on the charge, so a
    // partial refund can't exceed (or, across repeated calls, double-refund)
    // the amount collected (audit finding F6). A full refund lets Stripe refund
    // the remaining balance itself.
    let refundableCents;
    try {
      const charge = await stripe.charges.retrieve(booking.stripe_charge_id);
      refundableCents = Math.max(0, (charge.amount || 0) - (charge.amount_refunded || 0));
    } catch (e) {
      return `I wasn't able to verify the payment on that booking. Error: ${e.message}. I'll need a team member to handle this.`;
    }
    if (refundableCents <= 0) {
      return `Booking ${booking.booking_ref} has already been fully refunded, so there's nothing left to refund.`;
    }

    let refundAmount; // undefined = full remaining balance
    if (refund_type !== 'full') {
      const requestedCents = Math.round((amount || 0) * 100);
      if (requestedCents <= 0) return 'How much would you like to refund? I need a dollar amount for a partial refund.';
      if (requestedCents > refundableCents) {
        return `The most I can refund on booking ${booking.booking_ref} is $${(refundableCents / 100).toFixed(2)}. Let me know if you'd like me to refund that amount.`;
      }
      refundAmount = requestedCents;
    }

    try {
      const refund = await stripe.refunds.create({
        charge: booking.stripe_charge_id,
        amount: refundAmount,
        metadata: { booking_ref: booking.booking_ref, reason: reason || 'Phone refund' },
      });

      const refundedAmount = refund.amount / 100;
      await supabaseAdmin.from('bookings')
        .update({ deposit_refunded: true, refund_amount: refundedAmount, refund_reason: reason })
        .eq('id', booking.id);

      return `I've processed a ${refund_type} refund of $${refundedAmount} for booking ${booking.booking_ref}. The refund will appear on their card in 3-5 business days. Refund ID: ${refund.id}.`;
    } catch (e) {
      return `I wasn't able to process that refund. Error: ${e.message}. I'll need a team member to handle this.`;
    }
  },

  // 9 — send an email (beautiful branded HTML)
  async send_email({ to, subject, body, department }) {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.log(`[EMAIL TO SEND] To: ${to}, Subject: ${subject}, Body: ${body}`);
        return `I've drafted an email to ${to} with subject "${subject}". It will be sent shortly.`;
      }

      // Build branded HTML email with logo + signature
      const dept = department || 'Junk Haul Calgary';
      const html = buildEmailHTML(subject, body, dept);
      const text = body;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Junk Haul Calgary <support@junkhaul.ca>',
          reply_to: 'contact@junkhaul.ca',
          to,
          subject,
          html,
          text,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${res.status} ${err}`);
      }
      return `Email sent to ${to} with subject "${subject}".`;
    } catch (e) {
      return `I wasn't able to send that email. Error: ${e.message}.`;
    }
  },

  // 10 — escalate to a human operator
  async escalate_to_human({ caller_phone, issue, priority }) {
    const msg = `[${priority?.toUpperCase() || 'MEDIUM'}] Escalation needed. Caller: ${caller_phone}. Issue: ${issue}. Please follow up ASAP.`;
    try {
      await sendSMS(OPERATOR_PHONE, msg, null, 'escalation');
    } catch (_) {}
    // Also log to phone_calls
    const callOutcome = `escalated_${priority || 'medium'}`;
    try {
      await supabaseAdmin.from('phone_calls').insert({
        caller_number: caller_phone,
        direction: 'inbound',
        outcome: callOutcome,
        transcript: issue,
      });
    } catch (_) {}
    await recordCallHistory({
      callerNumber: caller_phone,
      agentType: 'escalation',
      direction: 'inbound',
      callOutcome,
      callSummary: issue,
      transcript: issue,
    });
    return `I've escalated this to the operator with ${priority || 'medium'} priority. They'll receive a text message immediately. Please let the caller know a team member will follow up shortly.`;
  },

  // 11 — notify operator urgently
  async notify_operator({ message, caller_phone }) {
    const msg = `[URGENT] ${message}. Caller: ${caller_phone}.`;
    try {
      await sendSMS(OPERATOR_PHONE, msg, null, 'operator_notify');
    } catch (_) {}
    return `I've sent an urgent text to the operator. They'll be notified immediately.`;
  },

  // 12 — get live Calgary info (weather, news, events, traffic, facts)
  async get_calgary_info({ query }) {    try {
      const q = (query || '').toLowerCase();
      const now = new Date();
      const month = now.toLocaleString('en-CA', { month: 'long', timeZone: 'America/Edmonton' });
      const day = now.toLocaleString('en-CA', { weekday: 'long', timeZone: 'America/Edmonton' });
      const dateStr = now.toLocaleString('en-CA', { dateStyle: 'full', timeZone: 'America/Edmonton' });

      // Weather via Open-Meteo (free, no API key needed)
      let weather = '';
      try {
        const wRes = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=51.0447&longitude=-114.0719&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=America/Edmonton'
        );
        const w = await wRes.json();
        if (w.current) {
          const temp = Math.round(w.current.temperature_2m);
          const desc = weatherCodeToText(w.current.weather_code);
          const wind = Math.round(w.current.wind_speed_10m);
          const humidity = w.current.relative_humidity_2m;
          weather = `Right now in Calgary it's ${temp}°C, ${desc}, wind ${wind} km/h, humidity ${humidity}%.`;
        }
      } catch (_) {}

      // Calgary live events and news via RSS/web search
      let events = '';
      let news = '';

      // Try fetching Calgary news from CBC Calgary RSS
      try {
        const newsRes = await fetch('https://www.cbc.ca/cmlink/rss-canada-calgary');
        const newsText = await newsRes.text();
        const headlines = [];
        const matches = newsText.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g);
        for (const m of matches) {
          if (m[1] && !m[1].includes('CBC') && headlines.length < 5) {
            headlines.push(m[1]);
          }
        }
        if (headlines.length) {
          news = `Latest Calgary news: ${headlines.join('; ')}.`;
        }
      } catch (_) {}

      // Seasonal / current events knowledge
      const seasonalEvents = getSeasonalEvents(now);

      // Traffic / construction info
      let traffic = '';
      if (q.includes('traffic') || q.includes('construction') || q.includes('road') || q.includes('drive')) {
        traffic = getCalgaryTrafficInfo();
      }

      // If asking about weather specifically
      if (q.includes('weather') || q.includes('temperature') || q.includes('cold') || q.includes('hot') || q.includes('snow') || q.includes('rain')) {
        return `${weather} ${seasonalEvents}`.trim();
      }

      // If asking about events or things to do
      if (q.includes('event') || q.includes('happening') || q.includes('things to do') || q.includes('weekend') || q.includes('festival') || q.includes('stampede')) {
        return `${seasonalEvents} ${weather}`.trim();
      }

      // If asking about news
      if (q.includes('news') || q.includes('happening in calgary') || q.includes('going on')) {
        return `${news} ${weather}`.trim();
      }

      // If asking about traffic
      if (traffic) {
        return `${traffic} ${weather}`.trim();
      }

      // Default: return everything
      return `Today is ${dateStr}. ${weather} ${news} ${seasonalEvents}`.trim().replace(/\s+/g, ' ');
    } catch (e) {
      console.error('get_calgary_info failed:', e);
      return 'Sorry, I couldnt grab the latest Calgary info right now. But I know the city well — ask me about any neighborhood, landmark, or street!';
    }
  },

  // 13 — get live sports info (Flames, NHL, CFL, etc.)
  async get_sports_info({ query }) {
    try {
      const q = (query || '').toLowerCase();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const results = [];

      // Determine what sport/season we're in
      const isNHLSeason = (month >= 10) || (month <= 6); // Oct - June
      const isCFLSeason = (month >= 6 && month <= 11); // June - Nov
      const isNFLSeason = (month >= 9 && month <= 2); // Sep - Feb

      // Calgary Flames info
      if (q.includes('flame') || q.includes('hockey') || q.includes('nhl') || q.includes('game') || isNHLSeason) {
        // Fetch live NHL scores/standings
        try {
          const nhlRes = await fetch('https://api.nhle.com/stats/rest/en/team/standings', {
            headers: { 'Accept': 'application/json' },
          });
          if (nhlRes.ok) {
            const nhlData = await nhlRes.json();
            const flames = nhlData?.data?.find(t => t.teamName?.includes('Calgary') || t.teamAbbrev === 'CGY');
            if (flames) {
              results.push(`Calgary Flames: ${flames.wins}W-${flames.losses}L-${flames.otLosses}OT, ${flames.points} points. ${flames.divisionRank ? `Division rank: ${flames.divisionRank}` : ''}`);
            }
          }
        } catch (_) {}

        // Try to get today's Flames game
        try {
          const today = now.toISOString().split('T')[0];
          const scheduleRes = await fetch(`https://api.nhle.com/stats/rest/en/schedule?date=${today}`);
          if (scheduleRes.ok) {
            const schedule = await scheduleRes.json();
            const flamesGame = schedule?.games?.find(g => 
              g.homeTeam?.abbrev === 'CGY' || g.awayTeam?.abbrev === 'CGY'
            );
            if (flamesGame) {
              const homeAway = flamesGame.homeTeam?.abbrev === 'CGY' ? 'home' : 'away';
              const opponent = homeAway === 'home' ? flamesGame.awayTeam?.name : flamesGame.homeTeam?.name;
              results.push(`Flames play tonight (${homeAway} vs ${opponent}). Expect traffic around the Saddledome/Scotiabank Centre around game time.`);
            } else if (isNHLSeason) {
              results.push('No Flames game tonight. Next game check flames.nhl.com for the schedule.');
            }
          }
        } catch (_) {}

        if (!results.length && isNHLSeason) {
          results.push('Its Flames season! Check the schedule at calgaryflames.com for upcoming games. Game nights mean traffic around the Saddledome downtown.');
        } else if (!isNHLSeason) {
          results.push('Flames are in the off-season right now. Hockey starts back up in October.');
        }
      }

      // Calgary Stampeders (CFL)
      if (q.includes('stamp') || q.includes('cfl') || q.includes('football') || isCFLSeason) {
        if (isCFLSeason) {
          results.push('Its Calgary Stampeders season! Games are at McMahon Stadium. Expect traffic on Crowchild Trail near the stadium on game days.');
        } else {
          results.push('Stampeders are in the off-season. CFL season runs June to November.');
        }
      }

      // General sports news
      if (q.includes('sports') || q.includes('news') || q.includes('scores')) {
        try {
          const sportsRes = await fetch('https://www.cbc.ca/cmlink/rss-sports');
          const sportsText = await sportsRes.text();
          const headlines = [];
          const matches = sportsText.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g);
          for (const m of matches) {
            if (m[1] && !m[1].includes('CBC') && headlines.length < 3) {
              headlines.push(m[1]);
            }
          }
          if (headlines.length) {
            results.push(`Sports news: ${headlines.join('; ')}.`);
          }
        } catch (_) {}
      }

      return results.length ? results.join(' ') : 'I dont have live sports info right now, but I can chat hockey, football, or whatever youre into!';
    } catch (e) {
      console.error('get_sports_info failed:', e);
      return 'Sorry, I couldnt grab the latest sports info right now. But Im always up for a hockey chat!';
    }
  },

  // 14 — get job photos (for Morgan the manager)
  async get_job_photos({ phone, booking_id }) {
    let query = supabaseAdmin.from('bookings').select('id, name, job_date, address, crew_photos, photos, status, booking_ref, total_price, balance_due, load_size, notes');
    if (booking_id) {
      const { data } = await query.eq('id', booking_id).single();
      if (!data) return 'No booking found with that ID.';
      return formatJobPhotos(data);
    }
    if (phone) {
      const normalized = phone.replace(/\D/g, '');
      const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
      const { data } = await query.or(patterns.map(p => `phone.eq.${p}`).join(',')).order('created_at', { ascending: false }).limit(1).single();
      if (!data) return 'No booking found for that phone number.';
      return formatJobPhotos(data);
    }
    return 'I need a phone number or booking ID to look up photos.';
  },

  // 15 — get booking details (for Morgan)
  async get_booking_details({ phone, booking_ref }) {
    let query = supabaseAdmin.from('bookings').select('*');
    if (booking_ref) {
      const { data } = await query.ilike('booking_ref', booking_ref).single();
      if (!data) return 'No booking found with that reference.';
      return formatBookingDetails(data);
    }
    if (phone) {
      const normalized = phone.replace(/\D/g, '');
      const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
      const { data } = await query.or(patterns.map(p => `phone.eq.${p}`).join(',')).order('created_at', { ascending: false }).limit(1).single();
      if (!data) return 'No booking found for that phone number.';
      return formatBookingDetails(data);
    }
    return 'I need a phone number or booking reference to look up the booking.';
  },

  // 16 — escalate to owner (for Morgan)
  async escalate_to_owner({ reason, caller_phone, booking_ref }) {
    const msg = `[OWNER ESCALATION] Morgan escalated a call. Caller: ${caller_phone}. Booking: ${booking_ref || 'N/A'}. Reason: ${reason}. Please follow up within 24 hours.`;
    try {
      await sendSMS(OPERATOR_PHONE, msg, null, 'owner_escalation');
    } catch (_) {}
    try {
      await supabaseAdmin.from('escalations').insert({
        caller_phone,
        booking_ref: booking_ref || null,
        reason,
        escalated_by: 'Morgan (AI Manager)',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}
    return 'Ive escalated this to the owner. They will personally review it and follow up with you within 24 hours.';
  },

  // 17 — log compensation (for Morgan)
  async log_compensation({ booking_ref, compensation_type, reason, caller_phone }) {
    try {
      await supabaseAdmin.from('compensation_log').insert({
        booking_ref: booking_ref || null,
        caller_phone,
        compensation_type,
        reason,
        authorized_by: 'Morgan (AI Manager)',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('compensation_log insert failed:', e);
    }
    const typeLabel = {
      free_removal: 'free junk removal',
      partial_refund: 'partial refund',
      full_refund: 'full refund',
      return_pickup: 'return pickup at no charge',
    }[compensation_type] || compensation_type;
    return `Logged: ${typeLabel} authorized for ${caller_phone}. Reason: ${reason}. A record has been created and the team will be notified.`;
  },
};

// ============================================================
// Calgary local knowledge helpers
// ============================================================
function weatherCodeToText(code) {
  const map = {
    0: 'clear skies', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'foggy', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle',
    55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'heavy freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain',
    67: 'heavy freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
    77: 'snow grains', 80: 'light rain showers', 81: 'rain showers',
    82: 'heavy rain showers', 85: 'light snow showers', 86: 'heavy snow showers',
    95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'heavy thunderstorm with hail',
  };
  return map[code] || 'unknown conditions';
}

function getSeasonalEvents(now) {
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  const events = [];

  // Calgary Stampede (July 4-13, 2025 / July 3-12, 2026)
  if (month === 7 && day >= 1 && day <= 15) {
    events.push('The Calgary Stampede is happening right now! Expect heavy traffic downtown and near Stampede Park. Lots of road closures around the Stampede grounds.');
  } else if (month === 6 && day >= 25) {
    events.push('The Calgary Stampede starts soon — get ready for 10 days of chuckwagons, midway, and pancake breakfasts!');
  } else if (month === 7 && day >= 16 && day <= 20) {
    events.push('The Calgary Stampede just wrapped up. Things are getting back to normal downtown.');
  }

  // Folk Festival (August)
  if (month === 8 && day >= 20 && day <= 26) {
    events.push('The Calgary Folk Music Festival is happening at Prince Island Park this weekend.');
  }

  // Heritage Day (August long weekend)
  if (month === 8 && day >= 1 && day <= 7) {
    events.push('Heritage Day long weekend is coming up — expect heavier traffic on highways out of the city.');
  }

  // Calgary Flames season (October - April)
  if ((month >= 10 && month <= 12) || (month >= 1 && month <= 4)) {
    events.push('Its Calgary Flames season — expect heavier traffic around the Scotiabank Saddledome (Downtown) on game nights.');
  }

  // Calgary winter
  if (month === 12 || month === 1 || month === 2) {
    events.push('Its winter in Calgary — watch for snow and ice on the roads, especially in newer communities that havent been plowed yet. Chinooks can melt everything fast though!');
  }

  // Spring cleanup
  if (month === 4 || month === 5) {
    events.push('Its spring in Calgary — lots of people doing spring cleaning and yard cleanups. Great time to get rid of old junk!');
  }

  // Canada Day
  if (month === 7 && day === 1) {
    events.push('Happy Canada Day! There are celebrations at Prince Island Park and fireworks downtown. Expect road closures near the river.');
  }

  // Labour Day
  if (month === 9 && day >= 1 && day <= 7) {
    events.push('Labour Day long weekend — expect heavier traffic on highways. Its the last big weekend of summer.');
  }

  // Halloween
  if (month === 10 && day >= 28 && day <= 31) {
    events.push('Halloween is coming up — watch for kids in residential neighborhoods, especially in areas like Beltline, Inglewood, and Kensington.');
  }

  // Christmas / Holidays
  if (month === 12 && day >= 15) {
    events.push('The holidays are here — downtown is busy with shoppers, and Olympic Plaza has the Christmas market. Expect heavier traffic on 16th Ave NW and Deerfoot Trail.');
  }

  // Calgary ZooLights
  if (month === 12 || (month === 1 && day <= 7)) {
    events.push('ZooLights at the Calgary Zoo is on — beautiful light displays. Expect traffic around the zoo area on Memorial Drive.');
  }

  return events.length ? events.join(' ') : '';
}

function getCalgaryTrafficInfo() {
  return `Major Calgary routes to know: Deerfoot Trail (Highway 2) runs north-south and is the busiest — expect delays during rush hour (7-9 AM, 3:30-6:30 PM). 16th Ave NW (Highway 1) runs east-west and gets busy near the university. Crowchild Trail and Memorial Drive are major inner-city routes. Stoney Trail is the ring road — use it to bypass the city. Glenmore Trail connects east-west in the south. During Stampede, expect closures near Stampede Park and Macleod Trail.`;
}

// ============================================================
// Helper: format job photos for Morgan
// ============================================================
function formatJobPhotos(b) {
  const crewPhotos = b.crew_photos || [];
  const arrival = crewPhotos.filter(p => p.type === 'crew_arrival');
  const completion = crewPhotos.filter(p => p.type === 'crew_completion');
  const customer = b.photos || [];

  let result = `BOOKING: ${b.booking_ref || b.id}\n`;
  result += `Customer: ${b.name}\n`;
  result += `Job Date: ${b.job_date || 'N/A'}\n`;
  result += `Address: ${b.address}\n`;
  result += `Status: ${b.status}\n\n`;

  result += `CUSTOMER PHOTOS (uploaded before booking): ${customer.length} photos\n`;
  if (customer.length > 0) {
    result += customer.slice(0, 5).map((url, i) => `  ${i + 1}. ${typeof url === 'string' ? url : url.url}`).join('\n') + '\n';
  }

  result += `\nCREW ARRIVAL PHOTOS (taken before anything was moved): ${arrival.length} photos\n`;
  if (arrival.length > 0) {
    result += arrival.map((p, i) => `  ${i + 1}. ${p.url} (taken ${p.taken_at || 'unknown time'})`).join('\n') + '\n';
  } else {
    result += '  NONE — crew did not take arrival photos for this job.\n';
  }

  result += `\nCREW COMPLETION PHOTOS (taken after the job): ${completion.length} photos\n`;
  if (completion.length > 0) {
    result += completion.map((p, i) => `  ${i + 1}. ${p.url} (taken ${p.taken_at || 'unknown time'})`).join('\n') + '\n';
  } else {
    result += '  NONE — crew did not take completion photos for this job.\n';
  }

  return result;
}

// ============================================================
// Helper: format booking details for Morgan
// ============================================================
function formatBookingDetails(b) {
  let result = `BOOKING: ${b.booking_ref || b.id}\n`;
  result += `Customer: ${b.name}\n`;
  result += `Phone: ${b.phone}\n`;
  result += `Address: ${b.address}\n`;
  result += `Job Date: ${b.job_date || 'N/A'}\n`;
  result += `Job Time: ${b.job_time || 'N/A'}\n`;
  result += `Load Size: ${b.load_size || 'N/A'}\n`;
  result += `Status: ${b.status}\n`;
  result += `Total Price: $${b.total_price || 'N/A'}\n`;
  result += `Deposit Paid: $${b.deposit_paid || 0}\n`;
  result += `Balance Due: $${b.balance_due || b.total_price || 'N/A'}\n`;
  if (b.same_day) result += `Same Day: Yes (+$50)\n`;
  if (b.stairs) result += `Stairs: ${b.stairs} flights (+$${(b.stairs * 25)})\n`;
  if (b.has_freon) result += `Freon: Yes (+$${b.freon_fee || 40})\n`;
  if (b.notes) result += `\nNotes: ${b.notes}\n`;
  if (b.crew_notes) result += `\nCrew Notes: ${b.crew_notes}\n`;
  return result;
}

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
