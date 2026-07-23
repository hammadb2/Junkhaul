import { NextResponse } from 'next/server';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';
import { sendWhatsApp, downloadWhatsAppMedia } from '@/lib/whatsapp';
import { calculatePrice, quoteCustomerPrice, getPricingConfig, LOAD_LABELS, PRICING } from '@/lib/pricing';
import { createQuoteDecision, linkQuoteDecisionToBooking } from '@/lib/quoteDecision';
import { toCents } from '@/lib/money';
import { analysePhotos, handleSafetyAlert, stripInternalFields } from '@/lib/ai';
import { edmontonNowParts, formatDateLong, formatTime, jobDateTimeUTC } from '@/lib/dates';
import { geocodeAddress } from '@/lib/geocode';
import { calculateTravelFee } from '@/lib/route';
import { sendDepositLink, sendOperatorAlert } from '@/lib/messages';
import { createDepositPayment } from '@/lib/stripe';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// WhatsApp Business Webhook
//
// GET  — Meta verification challenge
// POST — Inbound WhatsApp messages (text, images)
//
// Uses the SAME "Casey" AI personality as SMS, so customers
// get the same experience whether they text via SMS or WhatsApp.
// ============================================================

// ── Webhook verification ──
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── Groq AI reply (same Casey personality as SMS) ──
async function groqChat(messages, maxTokens = 300) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: maxTokens,
        temperature: 0.5,
        messages,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('Groq chat failed:', e.message);
    return null;
  }
}

// ── Get conversation history ──
async function getRecentMessages(from, limit = 20) {
  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('body, direction, message_type, sent_at')
    .or(`from_number.eq.${from},to_number.eq.${from}`)
    .order('sent_at', { ascending: false })
    .limit(limit);
  return (msgs || []).reverse();
}

function detectStage(messages) {
  const lastOutbound = [...messages].reverse().find(m =>
    m.direction === 'outbound' &&
    !['temp_address', 'temp_name', 'temp_slots', 'photo_analysis', 'whatsapp_outbound'].includes(m.message_type)
  );
  const body = (lastOutbound?.body || '').toLowerCase();
  if (body.includes('looking at $') || body.includes('youre looking at') || body.includes('thatll be $') || body.includes('total is $')) return 'quote_given';
  if (body.includes('whats the pickup address') || body.includes('whats your address')) return 'awaiting_address';
  if (body.includes('whats your name') || body.includes('who am i talking to')) return 'awaiting_name';
  if (body.includes('pick a slot') || body.includes('which slot') || body.includes('reply 1') || body.includes('reply 2')) return 'awaiting_slot_choice';
  if (body.includes('deposit link') || body.includes('pay your $50') || body.includes('payment link')) return 'deposit_sent';
  return 'ongoing';
}

function looksLikeAddress(text) {
  const t = (text || '').trim();
  return t.length > 5 && /\d/.test(t) && /\b(st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|cres|crescent|way|place|pl|court|ct|lane|ln|ne|nw|se|sw)\b/i.test(t);
}

function isYes(text) {
  return /^(yes|yeah|yep|sure|book|lets do it|sounds good|do it|im in|lets book|book it|perfect|great|ok|okay|cool|nice|yup|ya)\b/i.test((text || '').trim());
}

function isNo(text) {
  return /^(no|nope|nah|cant|later|maybe later|not now|not yet|maybe|ill think about it)\b/i.test((text || '').trim());
}

function isPaid(text) {
  return /^(paid|done|paid it|deposit paid|i paid|just paid|completed|finished|all done|sent it|sent the money)\b/i.test((text || '').trim());
}

// ── Generate AI reply (same Casey prompt as SMS) ──
async function generateReply(from, text, messages, booking, stage) {
  const history = messages
    .filter(m => !['temp_address', 'temp_name', 'temp_slots', 'photo_analysis'].includes(m.message_type))
    .slice(-16)
    .map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body || '',
    }))
    .filter(m => m.content);

  const systemPrompt = `You are Casey from Junk Haul Calgary. You are a real person texting a customer from your personal phone. This is a normal text conversation, not a bot, not a business template.

YOUR PERSONALITY:
- Youre a real 20s guy in Calgary. Friendly, straight to the point, genuine.
- You dont over explain. Short texts. Real conversation.
- You crack the occasional joke if the vibe is right.
- Youre helpful but not pushy. Youre not a salesman, youre the guy who picks up your junk.

MATCH THEIR ENERGY:
- Read how the customer texts and mirror their tone and style.
- If they use slang, you use slang back.
- If they text proper and polite, you match that.
- If theyre short and blunt, you keep it short and blunt back.
- If they use emojis, throw one back occasionally.

COMPANY INFO (use these numbers when asked):
- Junk removal in Calgary
- Pickups on Thursdays and Sundays
- Same day available for extra $50
- Two man crew, licensed and insured
- Single item: $99 (one couch, one mattress, one fridge, etc)
- Quarter load: $160 (a few items and some boxes)
- Half load: $240 (half a truck of household junk)
- Full load: $380 (garage cleanout, full truck)
- Fridge, freezer, AC units: $40 each extra (freon disposal fee)
- Stairs: $25 per flight extra
- $50 to lock in a booking, rest due when we pick up
- Cancel more than 24 hours before: full deposit back
- Cancel within 24 hours: no refund
- Website: junkhaul.ca
- Phone: (587) 325 0751

${booking ? `THIS CUSTOMER HAS A BOOKING:
- Ref: ${booking.booking_ref}
- Status: ${booking.status}
- Load: ${booking.load_size}
- Date: ${booking.job_date}
- Time: ${booking.job_time}
- Address: ${booking.address}
- Total: $${booking.total_price}
- Deposit paid: $${booking.deposit_paid}
- Balance: $${booking.balance_due}` : 'This customer does not have a booking yet.'}

CONVERSATION STAGE: ${stage}

ABSOLUTE RULES:
1. NEVER use dashes, hyphens, or minus signs in your reply.
2. NEVER use apostrophes. Dont write "whats", write "whats".
3. NEVER say you are an AI, bot, assistant, or automated system. You are Casey.
4. Keep it short. Under 160 characters when you can.
5. MIRROR THEIR TONE.
6. REMEMBER THE CONVERSATION. Dont ask things they already told you.
7. DONT REPEAT YOURSELF.
8. If they want to book, walk them through it naturally.
9. If they want to cancel, say "no worries, I can cancel that for you" and confirm.
10. If they want to reschedule, ask what day works better.
11. If they ask something you dont know, say youll check or give them the phone number.
12. If theyre angry, be calm and empathetic.
13. Do NOT use the word "deposit" unless they ask about money. Just say "$50 to lock it in".
14. Phone numbers: write them as (587) 325 0751, no dashes.
15. Booking refs: write them as "JH ABC23" with a space, no dash.`;

  try {
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: text || '' },
    ];

    let reply = await groqChat(allMessages, 300);
    if (reply) reply = reply.replace(/-/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
    return reply;
  } catch (e) {
    console.error('WhatsApp AI reply failed:', e);
    return null;
  }
}

// ── Get available slots ──
async function getAvailableSlots() {
  const today = edmontonNowParts().date;
  const { data } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('is_available', true)
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true })
    .limit(20);
  return (data || []).filter(s => s.jobs_booked < s.max_jobs);
}

// ── Create booking from WhatsApp ──
async function createWhatsAppBooking({ name, phone, address, load_size, job_date, job_time, stairs, has_freon, freon_count }) {
  const pricingConfig = await getPricingConfig();
  const geo = await geocodeAddress(address);
  let travelFee = 0;
  let travelKm = 0;
  try {
    const t = await calculateTravelFee({ lat: geo.lat, lng: geo.lng });
    travelFee = t.fee;
    travelKm = t.km;
  } catch {}

  // Real cost-engine price — same source of truth as the web booking flow
  // (lib/pricing.js's quoteCustomerPrice).
  const priced = await quoteCustomerPrice({
    load_size, stairs, has_freon, freon_count, job_date, job_time,
    travel_fee: travelFee, lat: geo.lat, lng: geo.lng, address,
    pricingConfig,
  });

  const quoteInput = {
    name, phone, address,
    load_size, stairs, has_freon, freon_count,
    job_date, job_time,
    lat: geo.lat, lng: geo.lng, travel_km: travelKm,
    requested_price_cents: toCents(priced.total),
    photo_skipped: true,
  };
  const decision = await createQuoteDecision({
    quoteInput,
    priceCents: toCents(priced.total),
    costSnapshot: priced.raw_cost_snapshot,
    depositCents: toCents(priced.deposit),
    actorType: 'whatsapp',
  });
  if (decision.state !== 'approved') {
    return { success: false, state: decision.state, reasons: decision.decision_reasons, error: 'Quote requires review or evidence' };
  }

  const { data: slot } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('slot_date', job_date)
    .eq('slot_time', job_time)
    .maybeSingle();

  if (!slot || slot.jobs_booked >= slot.max_jobs) {
    return { success: false, error: 'That slot just filled up' };
  }

  const bookingRef = 'JH ' + Math.random().toString(36).substring(2, 7).toUpperCase();

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      name, phone, address,
      quadrant: geo.quadrant, lat: geo.lat, lng: geo.lng,
      load_size,
      base_price: priced.base_price,
      same_day: false, same_day_fee: 0,
      stairs, stairs_fee: priced.stairs_fee,
      has_freon, freon_count, freon_fee: priced.freon_fee,
      travel_fee: priced.travel_fee, travel_km: travelKm,
      truck_size: priced.truck_size,
      total_price: priced.total,
      deposit_amount: priced.deposit,
      deposit_paid: 0, balance_due: priced.balance_due,
      job_date, job_time,
      job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
      status: 'pending_payment',
      booking_ref: bookingRef,
      source: 'whatsapp',
      photo_skipped: true,
      quote_decision_id: decision.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  await linkQuoteDecisionToBooking({ decisionId: decision.id, bookingId: booking.id });

  // Create Stripe PaymentIntent
  try {
    const intent = await createDepositPayment({
      booking_id: booking.id,
      customer_name: name,
      amount_cents: decision.deposit_cents,
      quote_decision_id: decision.id,
      quote_decision_ref: decision.quote_decision_ref,
    });
    await supabaseAdmin.from('bookings').update({ stripe_payment_intent_id: intent.id }).eq('id', booking.id);
  } catch (e) {
    console.error('Stripe deposit intent failed for WhatsApp booking:', e.message);
  }

  // Tracking token
  const trackingToken = randomBytes(16).toString('hex');
  await supabaseAdmin.from('bookings').update({ tracking_token: trackingToken }).eq('id', booking.id);

  // Operator alert — WhatsApp bookings never sent this (audit C1); only the
  // web flow (via the Stripe deposit webhook's handleBookingConfirmed) did.
  try {
    await sendOperatorAlert(booking);
  } catch (e) {
    console.error('[whatsapp] operator alert failed:', e.message);
  }

  return { success: true, booking };
}

// ── Upload photo to storage ──
async function uploadPhotoToStorage(base64) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const path = `${new Date().toISOString().slice(0, 10)}/${randomBytes(16).toString('hex')}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) return null;
    const { data } = supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
}

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================
export async function POST(req) {
  try {
    const body = await req.json();

    // Meta webhook format: entry[].changes[].value
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) return NextResponse.json({ ok: true });

    // Only handle messages (not status updates)
    if (value.messaging_product !== 'whatsapp' || !value.messages?.length) {
      return NextResponse.json({ ok: true });
    }

    const message = value.messages[0];
    const from = message.from; // phone number with country code, no +
    const messageType = message.type;
    const messageId = message.id;

    // Deduplicate
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('provider_sid', messageId)
        .maybeSingle();
      if (existing) return NextResponse.json({ ok: true });
    }

    // Extract text content
    let text = '';
    let hasPhotos = false;
    let photoBase64s = [];

    if (messageType === 'text') {
      text = message.text?.body || '';
    } else if (messageType === 'image') {
      hasPhotos = true;
      const imageId = message.image?.id;
      if (imageId) {
        const b64 = await downloadWhatsAppMedia(imageId);
        if (b64) {
          photoBase64s.push(b64);
          await uploadPhotoToStorage(b64);
        }
      }
      // Image can also have a caption
      text = message.image?.caption || '';
    } else {
      // Other message types (audio, video, document, etc.) — acknowledge
      await sendWhatsApp(from, 'Hey! Thanks for messaging Junk Haul Calgary. Send me a photo of what you need hauled and Ill get you a price right away. Or call (587) 325 0751.', null, 'whatsapp_auto_ack');
      return NextResponse.json({ ok: true });
    }

    const upper = text.trim().toUpperCase();

    // Look up customer
    const normalizedPhone = from.replace(/^\+?1?/, '').replace(/\D/g, '');
    const phonePatterns = [`+1${normalizedPhone}`, `1${normalizedPhone}`, normalizedPhone, from];

    const { data: recentBooking } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Log inbound message
    await supabaseAdmin.from('messages').insert({
      booking_id: recentBooking?.id || null,
      direction: 'inbound',
      from_number: from,
      to_number: 'whatsapp',
      message_type: 'whatsapp_inbound',
      body: text,
      provider_sid: messageId,
    });

    // ── STOP / HELP ──
    if (upper === 'STOP' || upper === 'UNSUBSCRIBE') {
      await sendWhatsApp(from, 'Youre unsubscribed from Junk Haul Calgary WhatsApp messages. Reply START if you want back in.', recentBooking?.id, 'optout');
      return NextResponse.json({ ok: true });
    }
    if (upper === 'HELP') {
      await sendWhatsApp(from, 'Junk Haul Calgary, same day junk removal. Book at junkhaul.ca or call (587) 325 0751. Reply STOP to opt out.', recentBooking?.id, 'help');
      return NextResponse.json({ ok: true });
    }

    // ── PHOTO HANDLING ──
    if (hasPhotos && photoBase64s.length > 0) {
      await sendWhatsApp(from, 'Got em! Let me take a look and Ill get you a price.', recentBooking?.id, 'photo_received');

      try {
        const analysis = await analysePhotos(photoBase64s);

        // Photo unusable (e.g. intimate content in frame) — ask for a retake,
        // never describe why. No quote, no stored analysis.
        if (analysis.photo_unusable) {
          await sendWhatsApp(from, 'Sorry, that photo didnt come through usable. Could you retake it and send it again?', recentBooking?.id, 'photo_unusable');
          return NextResponse.json({ ok: true });
        }

        // Safety alert: route privately to operator, then strip from anything
        // customer-facing (including the stored analysis below).
        await handleSafetyAlert(analysis, { source: 'whatsapp', booking_id: recentBooking?.id || null, lead_phone: from });
        const safeAnalysis = stripInternalFields(analysis);

        const load_size = safeAnalysis.load_size || 'quarter';
        const freon_count = safeAnalysis.freon_count || (safeAnalysis.has_freon ? 1 : 0);
        const pricingConfig = await getPricingConfig();
        // Flat-rate estimate is intentional here: the address isn't known
        // yet at this point in the conversation, so a real route distance
        // can't be computed. createWhatsAppBooking() (below, once address/
        // date are confirmed) uses the real cost engine for the actual
        // charged price.
        const priced = calculatePrice({ load_size, has_freon: safeAnalysis.has_freon, freon_count, pricingConfig });

        let msg = `Based on your photos youre looking at a ${LOAD_LABELS[load_size]}, $${priced.total} total.`;
        msg += ` Thats $50 to lock it in and $${priced.balance_due} when we pick up.`;
        if (safeAnalysis.has_freon && freon_count > 0) {
          msg += ` Includes $${priced.freon_fee} for the ${freon_count} freon appliance${freon_count > 1 ? 's' : ''}.`;
        }
        if (safeAnalysis.items_detected && safeAnalysis.items_detected.length > 0) {
          const items = safeAnalysis.items_detected.slice(0, 5).map(i => `${i.quantity}x ${i.name}`).join(', ');
          msg += ` I can see: ${items}.`;
        }
        if (safeAnalysis.has_hazmat) {
          const reason = safeAnalysis.hazmat_description || (safeAnalysis.hazmat_items?.join(', ') || 'some items we cant take');
          msg += ` Heads up: ${reason}. Well have to leave those.`;
        }
        msg += ` Want to book a pickup?`;

        await sendWhatsApp(from, msg, recentBooking?.id, 'photo_quote');

        // Store analysis (internal fields already stripped)
        await supabaseAdmin.from('messages').insert({
          booking_id: recentBooking?.id || null,
          direction: 'outbound',
          to_number: from,
          from_number: 'whatsapp',
          message_type: 'photo_analysis',
          body: JSON.stringify({ analysis: safeAnalysis, price: priced.total, load_size, has_freon: safeAnalysis.has_freon, freon_count }),
        });

        return NextResponse.json({ ok: true });
      } catch (e) {
        console.error('WhatsApp photo analysis failed:', e);
        // Fall through to AI
      }
    }

    // ── Get conversation history and detect stage ──
    const messages = await getRecentMessages(from);
    const stage = detectStage(messages);

    // ── CANCEL ──
    if (upper === 'CANCEL' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
      try {
        const { cancelBooking } = await import('@/lib/cancellations');
        await cancelBooking(recentBooking.id, 'Customer requested via WhatsApp', 'customer');
        await sendWhatsApp(from, `Done, I cancelled booking ${recentBooking.booking_ref}. Your deposit will be refunded if it was more than 24 hours out. Anything else I can help with?`, recentBooking.id, 'cancel_confirm');
      } catch {
        await sendWhatsApp(from, `Hmm, I couldnt cancel that one. Give us a call at (587) 325 0751 and well sort it out.`, recentBooking.id, 'error');
      }
      return NextResponse.json({ ok: true });
    }

    // ── BOOKING FLOW: quote given and they say yes ──
    if (stage === 'quote_given' && isYes(text)) {
      await sendWhatsApp(from, 'Awesome! Whats the pickup address?', recentBooking?.id, 'booking_ask_address');
      return NextResponse.json({ ok: true });
    }

    // ── BOOKING FLOW: awaiting address ──
    if (stage === 'awaiting_address' && looksLikeAddress(text)) {
      await sendWhatsApp(from, 'Got it. Whats your name?', recentBooking?.id, 'booking_ask_name');
      await supabaseAdmin.from('messages').insert({
        booking_id: recentBooking?.id || null,
        direction: 'outbound', to_number: from, from_number: 'whatsapp',
        message_type: 'temp_address', body: text.trim(),
      });
      return NextResponse.json({ ok: true });
    }

    // ── BOOKING FLOW: awaiting name ──
    if (stage === 'awaiting_name') {
      const name = text?.trim();
      if (name && name.length > 1 && name.length < 50 && !/^\d+$/.test(name)) {
        const { data: tempMsg } = await supabaseAdmin
          .from('messages')
          .select('body')
          .eq('to_number', from)
          .eq('message_type', 'temp_address')
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle();

        const address = tempMsg?.body || '';
        const slots = await getAvailableSlots();

        if (slots.length === 0) {
          await sendWhatsApp(from, `Oh man, we dont have any open slots right now ${name}. I can put you on the waitlist and text you when something opens up, or you can keep an eye on junkhaul.ca/book. What do you think?`, null, 'no_slots');
          return NextResponse.json({ ok: true });
        }

        const nextSlots = slots.slice(0, 4);
        const slotText = nextSlots.map((s, i) => `Reply ${i + 1} for ${formatDateLong(s.slot_date)} at ${formatTime(s.slot_time)}`).join('. ');
        await sendWhatsApp(from, `Nice to meet you ${name}! Here are the next available slots: ${slotText}`, null, 'booking_show_slots');

        await supabaseAdmin.from('messages').insert({
          direction: 'outbound', to_number: from, from_number: 'whatsapp',
          message_type: 'temp_name', body: name,
        });
        await supabaseAdmin.from('messages').insert({
          direction: 'outbound', to_number: from, from_number: 'whatsapp',
          message_type: 'temp_slots', body: JSON.stringify(nextSlots.map(s => ({ date: s.slot_date, time: s.slot_time }))),
        });
        return NextResponse.json({ ok: true });
      }
    }

    // ── BOOKING FLOW: awaiting slot choice ──
    if (stage === 'awaiting_slot_choice') {
      const choice = parseInt(text?.trim());
      if (choice >= 1 && choice <= 4) {
        const { data: tempMsgs } = await supabaseAdmin
          .from('messages')
          .select('body, message_type')
          .eq('to_number', from)
          .in('message_type', ['temp_name', 'temp_address', 'temp_slots'])
          .order('created_at', { ascending: false })
          .limit(3);

        const nameMsg = tempMsgs?.find(m => m.message_type === 'temp_name');
        const addressMsg = tempMsgs?.find(m => m.message_type === 'temp_address');
        const slotsMsg = tempMsgs?.find(m => m.message_type === 'temp_slots');

        const name = nameMsg?.body || 'Customer';
        const address = addressMsg?.body || '';
        let slots = [];
        try { slots = JSON.parse(slotsMsg?.body || '[]'); } catch {}

        if (slots[choice - 1] && address) {
          const selectedSlot = slots[choice - 1];

          // Get last photo analysis
          const { data: analysisMsg } = await supabaseAdmin
            .from('messages')
            .select('body')
            .eq('to_number', from)
            .eq('message_type', 'photo_analysis')
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle();

          let load_size = 'quarter';
          let has_freon = false;
          let freon_count = 0;
          if (analysisMsg?.body) {
            try {
              const parsed = JSON.parse(analysisMsg.body);
              load_size = parsed.load_size || parsed.analysis?.load_size || 'quarter';
              has_freon = parsed.has_freon ?? parsed.analysis?.has_freon ?? false;
              freon_count = parsed.freon_count ?? parsed.analysis?.freon_count ?? 0;
            } catch {}
          }

          const result = await createWhatsAppBooking({
            name, phone: from, address, load_size,
            job_date: selectedSlot.date, job_time: selectedSlot.time,
            stairs: 0, has_freon, freon_count,
          });

          if (result.success) {
            await sendDepositLink(result.booking);
            await sendWhatsApp(from, `Booked! ${formatDateLong(selectedSlot.date)} at ${formatTime(selectedSlot.time)}. I just sent you the payment link, $50 to lock it in. Your ref is ${result.booking.booking_ref}.`, result.booking.id, 'booking_confirmed');
            await supabaseAdmin.from('messages')
              .delete()
              .eq('to_number', from)
              .in('message_type', ['temp_name', 'temp_address', 'temp_slots']);
            return NextResponse.json({ ok: true });
          } else {
            await sendWhatsApp(from, `Ah, that slot just got taken. Want me to find you another one?`, null, 'booking_failed');
            return NextResponse.json({ ok: true });
          }
        }
      }
    }

    // ── DEPOSIT SENT: they say they paid ──
    if (stage === 'deposit_sent' && isPaid(text)) {
      await sendWhatsApp(from, 'Perfect, we got it! Youre all set. Well text you the day before your pickup and again when were on the way. Any questions just text me here.', recentBooking?.id, 'deposit_confirmed');
      return NextResponse.json({ ok: true });
    }
    if (stage === 'deposit_sent' && isNo(text)) {
      await sendWhatsApp(from, 'No worries, the link doesnt expire. Pay it whenever youre ready and the slot is yours. Questions? Just text me.', recentBooking?.id, 'deposit_later');
      return NextResponse.json({ ok: true });
    }

    // ── EVERYTHING ELSE: AI handles it ──
    const aiReply = await generateReply(from, text, messages, recentBooking, stage);

    if (aiReply) {
      await sendWhatsApp(from, aiReply, recentBooking?.id, 'whatsapp_ai_reply');
      return NextResponse.json({ ok: true });
    }

    // ── AI failed, fallback ──
    await sendWhatsApp(from, 'Hey! Thanks for messaging Junk Haul Calgary. Send me a photo of what you need hauled and Ill get you a price right away. Or call (587) 325 0751.', recentBooking?.id, 'whatsapp_auto_ack');

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('WhatsApp webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}
