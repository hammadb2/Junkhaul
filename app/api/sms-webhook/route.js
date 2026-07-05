import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { calculatePrice } from '@/lib/pricing';
import { cancelBooking } from '@/lib/cancellations';
import { rescheduleBooking } from '@/lib/reschedule';
import { edmontonNowParts, formatDateLong, formatTime } from '@/lib/dates';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

// Use Groq (same AI we already have) to understand arbitrary customer texts.
// No additional AI service needed.
let _groq = null;
function getGroq() {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  _groq = new Groq({ apiKey });
  return _groq;
}

// Parse customer intent from any text message.
async function parseIntent(text, hasBooking) {
  const client = getGroq();
  if (!client) return null; // Fall back to keyword matching

  try {
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: `You are an SMS intent parser for a junk removal company in Calgary. A customer sent this text: "${text}"

${hasBooking ? 'The customer has an active booking.' : 'The customer may not have a booking yet.'}

Return ONLY valid JSON:
{
  "intent": "cancel|reschedule|confirm|book|question|complaint|upgrade_yes|upgrade_no|waitlist_yes|stop|help|other",
  "preferred_day": "sunday|saturday|weekday|any|null",
  "urgency": "high|normal|low",
  "summary": "one line summary of what the customer wants"
}

Intent definitions:
- cancel: wants to cancel their booking
- reschedule: wants to change their pickup date/time
- confirm: confirming they'll be home / confirming appointment
- book: wants to book a new pickup (no existing booking)
- question: asking about pricing, what we take, hours, etc
- complaint: unhappy about something
- upgrade_yes: confirming a load upgrade
- upgrade_no: declining a load upgrade
- waitlist_yes: claiming a waitlist spot
- stop: wants to stop receiving texts
- help: needs help
- other: anything else`,
        },
      ],
    });

    let cleaned = response.choices[0]?.message?.content?.trim() || '';
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) cleaned = fence[1].trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1) cleaned = cleaned.slice(first, last + 1);
    return JSON.parse(cleaned);
  } catch {
    return null; // Fall back to keyword matching
  }
}

// Normalise both the Quo beta envelope and legacy shapes into {from, text}.
function parseInbound(payload) {
  // Beta: { type, data: { resource: { text, direction }, context: { senderIdentifier } } }
  if (payload?.data?.resource) {
    return {
      type: payload.type,
      from: payload.data.context?.senderIdentifier || null,
      text: payload.data.resource?.text || '',
    };
  }
  // Legacy: { type, data: { object: { from, to, body/text } } }
  const obj = payload?.data?.object || payload?.object || {};
  return {
    type: payload?.type,
    from: obj.from || null,
    text: obj.body || obj.text || '',
  };
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { type, from, text } = parseInbound(payload);

  // Only act on inbound messages.
  if (type && type !== 'message.received') return NextResponse.json({ ok: true });
  if (!from) return NextResponse.json({ ok: true });

  const upper = (text || '').trim().toUpperCase();

  // Log the inbound message.
  const { data: recentBooking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('phone', from)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabaseAdmin.from('messages').insert({
    booking_id: recentBooking?.id || null,
    direction: 'inbound',
    from_number: from,
    to_number: process.env.QUO_PHONE_NUMBER,
    message_type: 'inbound',
    body: text,
  });

  // ── STOP / HELP ──
  if (upper === 'STOP' || upper === 'UNSUBSCRIBE') {
    await sendSMS(from, 'You\'re unsubscribed from Junk Haul Calgary texts. Reply START if you want back in.', recentBooking?.id, 'optout');
    return NextResponse.json({ ok: true });
  }
  if (upper === 'HELP') {
    await sendSMS(from, 'Junk Haul Calgary, same-day junk removal. Book at junkhaul.ca or call (587) 325-0751. Reply STOP to opt out.', recentBooking?.id, 'help');
    return NextResponse.json({ ok: true });
  }

  // ── CANCEL — customer cancels their booking via SMS ──
  if (upper === 'CANCEL' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    try {
      await cancelBooking(recentBooking.id, 'Customer requested via SMS', 'customer');
      // SMS to customer + operator sent inside cancelBooking()
    } catch (err) {
      await sendSMS(from, `Sorry, I couldn't cancel booking ${recentBooking.booking_ref}. Please call us.`, recentBooking.id, 'error');
    }
    return NextResponse.json({ ok: true });
  }

  // ── RESCHEDULE — send day options ──
  if (upper === 'RESCHEDULE' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    await sendSMS(
      from,
      `To reschedule booking ${recentBooking.booking_ref}, reply with:\n\nSUNDAY for the next available Sunday\n\nOr call us at (587) 325-0751 to pick a specific time.`,
      recentBooking.id,
      'reschedule_options'
    );
    return NextResponse.json({ ok: true });
  }

  // ── SUNDAY — pick next available Sunday slot for reschedule ──
  if (upper === 'SUNDAY' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    const today = edmontonNowParts().date;
    const { data: nextSlot } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('day_type', 'sunday')
      .eq('is_available', true)
      .gt('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextSlot) {
      const result = await rescheduleBooking(recentBooking.id, nextSlot.slot_date, nextSlot.slot_time);
      if (!result.success) {
        await sendSMS(from, `${result.error}\n\nBook at junkhaul.ca or call (587) 325-0751.`, recentBooking.id, 'error');
      }
      // Success SMS sent inside rescheduleBooking()
    } else {
      await sendSMS(
        from,
        `No Sunday slots open right now. Check junkhaul.ca or call (587) 325-0751.`,
        recentBooking.id,
        'no_slots'
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── NO — decline a pending load upgrade ──
  if (upper === 'NO' && recentBooking?.upgrade_pending) {
    await supabaseAdmin
      .from('bookings')
      .update({ upgrade_pending: false })
      .eq('id', recentBooking.id);
    await sendSMS(
      from,
      `No problem, your original booking stays as is. See you on ${formatDateLong(recentBooking.job_date)} at ${formatTime(recentBooking.job_time)}! Ref: ${recentBooking.booking_ref}`,
      recentBooking.id,
      'upgrade_declined'
    );
    return NextResponse.json({ ok: true });
  }

  // ── YES — confirm a pending load upgrade ──
  if (upper === 'YES' && recentBooking?.upgrade_pending && recentBooking?.suggested_load_size) {
    const priced = calculatePrice({
      load_size: recentBooking.suggested_load_size,
      same_day: recentBooking.same_day,
      stairs: recentBooking.stairs,
      has_freon: recentBooking.has_freon,
      job_date: recentBooking.job_date,
      job_time: recentBooking.job_time,
    });
    await supabaseAdmin
      .from('bookings')
      .update({
        load_size: recentBooking.suggested_load_size,
        base_price: priced.base_price,
        total_price: priced.total,
        balance_due: priced.balance_due,
        upgrade_pending: false,
      })
      .eq('id', recentBooking.id);
    await sendSMS(
      from,
      `Upgraded! Your booking ${recentBooking.booking_ref} is now $${priced.total} total. $50 deposit already paid, $${priced.balance_due} due on pickup day. See you then!`,
      recentBooking.id,
      'upgrade_confirm'
    );
    return NextResponse.json({ ok: true });
  }

  // ── YES — claim a waitlist spot ──
  const { data: waitlistEntry } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('phone', from)
    .eq('notified', true)
    .is('converted_to_booking_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('notified_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (upper === 'YES' && waitlistEntry) {
    await sendSMS(
      from,
      `Great! Grab your spot here (deposit required to lock it in): ${process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca'}/book`,
      null,
      'waitlist_claim'
    );
    return NextResponse.json({ ok: true });
  }

  // ── Fallback: use Groq to understand the message and respond intelligently ──
  const intent = await parseIntent(text, !!recentBooking);

  // Handle parsed intents that weren't caught by keyword matching
  if (intent) {
    // Booking intent (no existing booking)
    if (intent.intent === 'book') {
      await sendSMS(
        from,
        `Thanks for reaching out! You can book a pickup online at junkhaul.ca or call us at (587) 325-0751 and we'll get you sorted. We run Sundays, same-day available.`,
        recentBooking?.id,
        'ai_book'
      );
      await sendSMS(
        process.env.HAMMAD_PHONE,
        `Text from ${from}${recentBooking ? ` (${recentBooking.booking_ref})` : ''}:\n"${text}"\n\nIntent: wants to book. ${intent.summary}`,
        recentBooking?.id,
        'inbound_forward'
      );
      return NextResponse.json({ ok: true });
    }

    // Question intent
    if (intent.intent === 'question') {
      await sendSMS(
        from,
        `Good question! We do junk removal across Calgary, Sundays with same-day available. Prices start at $99 for a single item. Book at junkhaul.ca or call (587) 325-0751. What else can we help with?`,
        recentBooking?.id,
        'ai_question'
      );
      await sendSMS(
        process.env.HAMMAD_PHONE,
        `Text from ${from}${recentBooking ? ` (${recentBooking.booking_ref})` : ''}:\n"${text}"\n\nIntent: question. ${intent.summary}`,
        recentBooking?.id,
        'inbound_forward'
      );
      return NextResponse.json({ ok: true });
    }

    // Complaint intent
    if (intent.intent === 'complaint') {
      await sendSMS(
        from,
        `Sorry to hear that. Hammad will personally call you shortly to sort this out. If it's urgent, call (587) 325-0751.`,
        recentBooking?.id,
        'ai_complaint'
      );
      await sendSMS(
        process.env.HAMMAD_PHONE,
        `COMPLAINT from ${from}${recentBooking ? ` (${recentBooking.booking_ref}, ${recentBooking.name})` : ''}:\n"${text}"\n\n${intent.summary}\nCall them ASAP.`,
        recentBooking?.id,
        'inbound_forward'
      );
      return NextResponse.json({ ok: true });
    }

    // Confirm intent
    if (intent.intent === 'confirm' && recentBooking) {
      await sendSMS(
        from,
        `Great, see you on ${formatDateLong(recentBooking.job_date)} at ${formatTime(recentBooking.job_time)}! Ref: ${recentBooking.booking_ref}`,
        recentBooking.id,
        'ai_confirm'
      );
      return NextResponse.json({ ok: true });
    }
  }

  // ── Final fallback: forward to operator + acknowledge customer ──
  await sendSMS(
    process.env.HAMMAD_PHONE,
    `Text from ${from}${recentBooking ? ` (${recentBooking.booking_ref}, ${recentBooking.name})` : ''}:\n\n"${text}"${intent ? `\n\nIntent: ${intent.intent}. ${intent.summary}` : ''}`,
    recentBooking?.id,
    'inbound_forward'
  );
  await sendSMS(
    from,
    'Thanks for your text! We\'ll get back to you shortly. For urgent help, call (587) 325-0751. Junk Haul Calgary',
    recentBooking?.id,
    'auto_ack'
  );

  return NextResponse.json({ ok: true });
}
