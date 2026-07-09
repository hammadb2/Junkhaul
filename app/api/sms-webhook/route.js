import { NextResponse } from 'next/server';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';
import { sendSMS as _sendSMS } from '@/lib/sms';
import { calculatePrice, getPricingConfig, LOAD_LABELS } from '@/lib/pricing';
import { cancelBooking } from '@/lib/cancellations';
import { rescheduleBooking } from '@/lib/reschedule';
import { analysePhotos } from '@/lib/ai';
import { edmontonNowParts, formatDateLong, formatTime } from '@/lib/dates';
import { geocodeAddress } from '@/lib/geocode';
import { sendDepositLink } from '@/lib/messages';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

let _groq = null;
function getGroq() {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  _groq = new Groq({ apiKey });
  return _groq;
}

// Wrapper that strips ALL dashes and apostrophes from outgoing SMS
async function sendSMS(to, body, booking_id = null, message_type = null) {
  const clean = body.replace(/-/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
  return _sendSMS(to, clean, booking_id, message_type);
}

// ============================================================
// Parse inbound Quo webhook (supports both beta and legacy)
// ============================================================
function parseInbound(payload) {
  if (payload?.data?.resource) {
    const r = payload.data.resource;
    const ctx = payload.data.context || {};
    return {
      type: payload.type,
      from: ctx.senderIdentifier || null,
      text: r.text || '',
      media: r.media || [],
      messageId: r.id || null,
    };
  }
  const obj = payload?.data?.object || payload?.object || {};
  return {
    type: payload?.type,
    from: obj.from || null,
    text: obj.body || obj.text || '',
    media: obj.media || [],
    messageId: obj.id || null,
  };
}

// ============================================================
// Get conversation history for AI context
// ============================================================
async function getRecentMessages(from, limit = 20) {
  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('body, direction, message_type, sent_at')
    .or(`from_number.eq.${from},to_number.eq.${from}`)
    .order('sent_at', { ascending: false })
    .limit(limit);
  return (msgs || []).reverse();
}

// ============================================================
// Detect conversation stage from recent messages
// ============================================================
function detectStage(messages) {
  const lastOutbound = [...messages].reverse().find(m => m.direction === 'outbound' && m.message_type !== 'temp_address' && m.message_type !== 'temp_name' && m.message_type !== 'temp_slots' && m.message_type !== 'photo_analysis');
  const body = (lastOutbound?.body || '').toLowerCase();

  if (body.includes('looking at $') || body.includes('youre looking at') || body.includes('thatll be $') || body.includes('that comes to $') || body.includes('total is $')) return 'quote_given';
  if (body.includes('whats the pickup address') || body.includes('whats your address') || body.includes('whats the address')) return 'awaiting_address';
  if (body.includes('whats your name') || body.includes('who am i talking to') || body.includes('what should i call you')) return 'awaiting_name';
  if (body.includes('pick a slot') || body.includes('which slot') || body.includes('which day') || body.includes('what day works')) return 'awaiting_slot_choice';
  if (body.includes('deposit link') || body.includes('deposit to lock') || body.includes('pay your $50')) return 'deposit_sent';
  return 'ongoing';
}

// ============================================================
// AI: Generate a natural SMS reply
// ============================================================
async function generateReply(from, text, messages, booking, media, stage) {
  const client = getGroq();
  if (!client) return null;

  const hasPhotos = media && media.length > 0;

  // Build conversation history for the AI — use ALL recent messages
  const history = messages
    .filter(m => m.message_type !== 'temp_address' && m.message_type !== 'temp_name' && m.message_type !== 'temp_slots' && m.message_type !== 'photo_analysis')
    .slice(-16)
    .map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body || '',
    }))
    .filter(m => m.content);

  // Add the current message
  const userContent = hasPhotos
    ? `[Customer sent ${media.length} photo(s)${text ? ` with message: "${text}"` : ' with no text'}]`
    : text || '';

  const systemPrompt = `You are Casey from Junk Haul Calgary. You are a real person texting a customer from your personal phone. This is a normal text conversation, not a bot, not a business template.

YOUR PERSONALITY:
- Youre a real 20s guy in Calgary. Friendly, straight to the point, genuine.
- You dont over explain. Short texts. Real conversation.
- You crack the occasional joke if the vibe is right.
- Youre helpful but not pushy. Youre not a salesman, youre the guy who picks up your junk.

MATCH THEIR ENERGY (this is the most important rule):
- Read how the customer texts and mirror their tone and style.
- If they use slang, you use slang back. "yo", "bet", "fr", "no cap", "say less", "word", "chill", "lowkey", "highkey", "ngl", "rn", "tbh", "wya", "fasho", "gotchu", "deadass", "bussin", "slaps", "fire", "lit", "valid"
- If they text proper and polite, you match that. "Of course", "absolutely", "no problem at all"
- If theyre short and blunt, you keep it short and blunt back. "yeah $99, when do you need it"
- If theyre chatty and use lots of words, you can be a bit more conversational too
- If they use emojis, throw one back occasionally (not every text, just when it fits)
- If they swear casually, you can swear casually too (not at them, just in general like "damn thats a lot of junk" or "hell yeah")
- If they type in all lowercase, do the same
- If they use proper capitalization, match that
- If they seem older or more formal, be respectful and clear
- If they seem young and casual, be young and casual
- You are a chameleon. You become whoever the customer needs you to be. But you are always Casey, always real, never fake.

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

${hasPhotos ? `The customer just sent ${media.length} photo(s). You already sent them a quote based on the photos. Now theyre replying to that quote.` : ''}

ABSOLUTE RULES:
1. NEVER use dashes, hyphens, or minus signs in your reply. No " - " and no "-". Use commas or just rephrase.
2. NEVER use apostrophes. Dont write "whats", write "whats". Dont write "youre", write "youre". Dont write "dont", write "dont". Just skip the apostrophe entirely. This is texting, nobody uses apostrophes in texts.
3. NEVER say you are an AI, bot, assistant, or automated system. You are Casey, a real person.
4. Keep it short. Under 160 characters when you can. Two short sentences max usually.
5. MIRROR THEIR TONE. If they slang, you slang. If they formal, you formal. If they blunt, you blunt. Always match.
6. REMEMBER THE CONVERSATION. If they already told you what they need hauled, dont ask again. If you already gave them a price, dont reintroduce yourself. Keep the flow going naturally. You are continuing a conversation, not starting a new one.
7. DONT REPEAT YOURSELF. If you already asked "what do you need hauled" and they answered, move forward. Dont circle back.
8. If they want to book, walk them through it naturally: ask what theyre hauling, where, when. Dont send a link unless they specifically ask for one.
9. If they want to cancel, say something like "no worries, I can cancel that for you. want me to go ahead?" and then tell them its done.
10. If they want to reschedule, ask what day works better and offer the next available slots.
11. If they ask something you dont know, say youll check and get back to them, or give them the phone number.
12. If theyre angry or upset, be calm and empathetic. Match their energy without escalating. "oh no, thats not good. tell me what happened and Ill sort it out."
13. If they send something random or weird, just roll with it like a real person would. Dont act confused or robotic.
14. Do NOT use the word "deposit" unless they ask about money or booking. Just say "$50 to lock it in" naturally.
15. Phone numbers: write them as (587) 325 0751, no dashes.
16. Booking refs: write them as "JH ABC23" with a space, no dash.`;

  try {
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userContent },
    ];

    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 300,
      temperature: 0.5,
      messages: allMessages,
    });
    let reply = response.choices[0]?.message?.content?.trim() || null;
    // Strip dashes and apostrophes that the AI might have added
    if (reply) reply = reply.replace(/-/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
    return reply;
  } catch (e) {
    console.error('AI reply failed:', e);
    return null;
  }
}

// ============================================================
// Download photo from URL and convert to base64
// ============================================================
async function downloadPhotoAsBase64(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (e) {
    console.error('Photo download failed:', e);
    return null;
  }
}

async function uploadPhotoToStorage(base64) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
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
// Get available slots
// ============================================================
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

// ============================================================
// Create a booking from SMS
// ============================================================
async function createSmsBooking({ name, phone, address, load_size, job_date, job_time, stairs, has_freon, freon_count }) {
  const pricingConfig = await getPricingConfig();
  const priced = calculatePrice({ load_size, stairs, has_freon, freon_count, job_date, job_time, pricingConfig });
  const geo = await geocodeAddress(address);

  const { data: slot } = await supabaseAdmin
    .from('schedule')
    .select('*')
    .eq('slot_date', job_date)
    .eq('slot_time', job_time)
    .maybeSingle();

  if (!slot || slot.jobs_booked >= slot.max_jobs) {
    return { success: false, error: 'That slot just filled up' };
  }

  // No dash in booking ref
  const bookingRef = 'JH ' + Math.random().toString(36).substring(2, 7).toUpperCase();

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      name, phone, address,
      quadrant: geo.quadrant, lat: geo.lat, lng: geo.lng,
      load_size,
      base_price: priced.base_price,
      same_day: false, same_day_fee: 0,
      stairs, has_freon, freon_count, freon_fee: priced.freon_fee,
      total_price: priced.total,
      deposit_paid: 0, balance_due: priced.balance_due,
      job_date, job_time,
      status: 'pending_payment',
      booking_ref: bookingRef,
      source: 'sms',
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await supabaseAdmin
    .from('schedule')
    .update({ jobs_booked: slot.jobs_booked + 1 })
    .eq('slot_date', job_date)
    .eq('slot_time', job_time);

  return { success: true, booking };
}

// ============================================================
// Check if text is an address
// ============================================================
function looksLikeAddress(text) {
  const t = (text || '').trim();
  return t.length > 5 && /\d/.test(t) && /\b(st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|cres|crescent|way|place|pl|court|ct|lane|ln|ne|nw|se|sw|close|bay|manor)\b/i.test(t);
}

// ============================================================
// Check if text is a yes/confirmation
// ============================================================
function isYes(text) {
  return /^(yes|yeah|yep|sure|book|lets do it|sounds good|do it|im in|lets book|book it|perfect|great|ok|okay|cool|nice|yup|ya|yes please|yeah sure|for sure|lets go)\b/i.test((text || '').trim());
}

function isNo(text) {
  return /^(no|nope|nah|cant|cant afford|later|maybe later|not now|ill do it later|not yet|maybe|ill think about it)\b/i.test((text || '').trim());
}

function isPaid(text) {
  return /^(paid|done|paid it|deposit paid|i paid|just paid|completed|finished|all done|sent it|sent the money|paid the deposit)\b/i.test((text || '').trim());
}

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { type, from, text, media, messageId } = parseInbound(payload);

  if (type && type !== 'message.received') return NextResponse.json({ ok: true });
  if (!from) return NextResponse.json({ ok: true });

  // ── DEDUPLICATE: Quo retries webhooks if we're slow to respond.
  //    If we already processed this messageId, skip immediately. ──
  if (messageId) {
    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('provider_sid', messageId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true });
  }

  const upper = (text || '').trim().toUpperCase();
  const hasPhotos = media && media.length > 0;

  // Look up customer
  const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');
  const phonePatterns = [from, `+1${normalizedPhone}`, `1${normalizedPhone}`, normalizedPhone];

  const { data: recentBooking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Log inbound message (store messageId as provider_sid for dedup)
  await supabaseAdmin.from('messages').insert({
    booking_id: recentBooking?.id || null,
    direction: 'inbound',
    from_number: from,
    to_number: process.env.QUO_PHONE_NUMBER,
    message_type: 'inbound',
    body: text,
    provider_sid: messageId || null,
  });

  // ── STOP / HELP (regulatory, must stay as keywords) ──
  if (upper === 'STOP' || upper === 'UNSUBSCRIBE') {
    await sendSMS(from, 'Youre unsubscribed from Junk Haul Calgary texts. Reply START if you want back in.', recentBooking?.id, 'optout');
    return NextResponse.json({ ok: true });
  }
  if (upper === 'HELP') {
    await sendSMS(from, 'Junk Haul Calgary, same day junk removal. Book at junkhaul.ca or call (587) 325 0751. Reply STOP to opt out.', recentBooking?.id, 'help');
    return NextResponse.json({ ok: true });
  }

  // ── PHOTO HANDLING (MMS) ──
  if (hasPhotos) {
    const photoBase64s = [];
    for (const m of media.slice(0, 3)) {
      if (m.type && m.type.startsWith('image/')) {
        const b64 = await downloadPhotoAsBase64(m.url);
        if (b64) {
          photoBase64s.push(b64);
          await uploadPhotoToStorage(b64);
        }
      }
    }

    if (photoBase64s.length > 0) {
      // Acknowledge immediately
      await sendSMS(from, 'Got em! Let me take a look and Ill get you a price.', recentBooking?.id, 'photo_received');

      try {
        const analysis = await analysePhotos(photoBase64s);
        const load_size = analysis.load_size || 'quarter';
        const freon_count = analysis.freon_count || (analysis.has_freon ? 1 : 0);
        const pricingConfig = await getPricingConfig();
        const priced = calculatePrice({ load_size, has_freon: analysis.has_freon, freon_count, pricingConfig });

        // Build quote conversationally, no dashes
        let msg = `Based on your photos youre looking at a ${LOAD_LABELS[load_size]}, $${priced.total} total.`;
        msg += ` Thats $50 to lock it in and $${priced.balance_due} when we pick up.`;
        if (analysis.has_freon && freon_count > 0) {
          msg += ` Includes $${priced.freon_fee} for the ${freon_count} freon appliance${freon_count > 1 ? 's' : ''}.`;
        }
        if (analysis.items_detected && analysis.items_detected.length > 0) {
          const items = analysis.items_detected.slice(0, 5).map(i => `${i.quantity}x ${i.name}`).join(', ');
          msg += ` I can see: ${items}.`;
        }
        if (analysis.has_hazmat) {
          msg += ` Heads up, I see some stuff we cant take (${analysis.hazmat_items?.join(', ') || 'hazardous materials'}). Well have to leave those.`;
        }
        msg += ` Want to book a pickup?`;

        await sendSMS(from, msg, recentBooking?.id, 'photo_quote');

        // Store analysis for booking flow
        await supabaseAdmin.from('messages').insert({
          booking_id: recentBooking?.id || null,
          direction: 'outbound',
          to_number: from,
          from_number: process.env.QUO_PHONE_NUMBER,
          message_type: 'photo_analysis',
          body: JSON.stringify({ analysis, price: priced.total, load_size, has_freon: analysis.has_freon, freon_count }),
        });

        return NextResponse.json({ ok: true });
      } catch (e) {
        console.error('Photo analysis failed:', e);
        // Fall through to AI which will ask them to describe it
      }
    }
  }

  // ── Get conversation history and detect stage ──
  const messages = await getRecentMessages(from);
  const stage = detectStage(messages);

  // ── CANCEL: if they say cancel and have a booking, do it then confirm conversationally ──
  if (upper === 'CANCEL' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    try {
      await cancelBooking(recentBooking.id, 'Customer requested via SMS', 'customer');
      await sendSMS(from, `Done, I cancelled booking ${recentBooking.booking_ref}. Your deposit will be refunded if it was more than 24 hours out. Anything else I can help with?`, recentBooking.id, 'cancel_confirm');
    } catch {
      await sendSMS(from, `Hmm, I couldnt cancel that one. Give us a call at (587) 325 0751 and well sort it out.`, recentBooking.id, 'error');
    }
    return NextResponse.json({ ok: true });
  }

  // ── BOOKING FLOW: quote given and they say yes ──
  if (stage === 'quote_given' && isYes(text)) {
    await sendSMS(from, 'Awesome! Whats the pickup address?', recentBooking?.id, 'booking_ask_address');
    return NextResponse.json({ ok: true });
  }

  // ── BOOKING FLOW: awaiting address ──
  if (stage === 'awaiting_address') {
    if (looksLikeAddress(text)) {
      await sendSMS(from, 'Got it. Whats your name?', recentBooking?.id, 'booking_ask_name');
      await supabaseAdmin.from('messages').insert({
        booking_id: recentBooking?.id || null,
        direction: 'outbound',
        to_number: from,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: 'temp_address',
        body: text.trim(),
      });
      return NextResponse.json({ ok: true });
    }
    // Doesn't look like an address, let AI handle it
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
        .limit(1)
        .maybeSingle();

      const address = tempMsg?.body || '';
      const slots = await getAvailableSlots();

      if (slots.length === 0) {
        await sendSMS(from, `Oh man, we dont have any open slots right now ${name}. I can put you on the waitlist and text you when something opens up, or you can keep an eye on junkhaul.ca/book. What do you think?`, null, 'no_slots');
        return NextResponse.json({ ok: true });
      }

      const nextSlots = slots.slice(0, 4);
      const slotText = nextSlots.map((s, i) => `Reply ${i + 1} for ${formatDateLong(s.slot_date)} at ${formatTime(s.slot_time)}`).join('. ');
      await sendSMS(from, `Nice to meet you ${name}! Here are the next available slots: ${slotText}`, null, 'booking_show_slots');

      await supabaseAdmin.from('messages').insert({
        direction: 'outbound', to_number: from, from_number: process.env.QUO_PHONE_NUMBER,
        message_type: 'temp_name', body: name,
      });
      await supabaseAdmin.from('messages').insert({
        direction: 'outbound', to_number: from, from_number: process.env.QUO_PHONE_NUMBER,
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

        // Get the last photo analysis for load size
        const { data: analysisMsg } = await supabaseAdmin
          .from('messages')
          .select('body')
          .eq('to_number', from)
          .eq('message_type', 'photo_analysis')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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

        const result = await createSmsBooking({
          name, phone: from, address, load_size,
          job_date: selectedSlot.date, job_time: selectedSlot.time,
          stairs: 0, has_freon, freon_count,
        });

        if (result.success) {
          await sendDepositLink(result.booking);
          await sendSMS(from, `Booked! ${formatDateLong(selectedSlot.date)} at ${formatTime(selectedSlot.time)}. I just sent you the payment link, $50 to lock it in. Your ref is ${result.booking.booking_ref}.`, result.booking.id, 'booking_confirmed');
          await supabaseAdmin.from('messages')
            .delete()
            .eq('to_number', from)
            .in('message_type', ['temp_name', 'temp_address', 'temp_slots']);
          return NextResponse.json({ ok: true });
        } else {
          await sendSMS(from, `Ah, that slot just got taken. Want me to find you another one?`, null, 'booking_failed');
          return NextResponse.json({ ok: true });
        }
      }
    }
    // Not a number, let AI handle it
  }

  // ── DEPOSIT SENT: they say they paid ──
  if (stage === 'deposit_sent' && isPaid(text)) {
    await sendSMS(from, 'Perfect, we got it! Youre all set. Well text you the day before your pickup and again when were on the way. Any questions just text me here.', recentBooking?.id, 'deposit_confirmed');
    return NextResponse.json({ ok: true });
  }
  if (stage === 'deposit_sent' && isNo(text)) {
    await sendSMS(from, 'No worries, the link doesnt expire. Pay it whenever youre ready and the slot is yours. Questions? Just text me.', recentBooking?.id, 'deposit_later');
    return NextResponse.json({ ok: true });
  }

  // ── EVERYTHING ELSE: AI handles it as a real conversation ──
  const aiReply = await generateReply(from, text, messages, recentBooking, hasPhotos ? media : null, stage);

  if (aiReply) {
    await sendSMS(from, aiReply, recentBooking?.id, 'ai_reply');
    return NextResponse.json({ ok: true });
  }

  // ── AI failed, last resort (still conversational, still no dashes) ──
  await sendSMS(from, 'Hey! Thanks for texting Junk Haul Calgary. Send me a photo of what you need hauled and Ill get you a price right away. Or call (587) 325 0751.', recentBooking?.id, 'auto_ack');
  await sendSMS(process.env.HAMMAD_PHONE, `Text from ${from}${recentBooking ? ` (${recentBooking.booking_ref}, ${recentBooking.name})` : ''}: "${text}"`, recentBooking?.id, 'inbound_forward');

  return NextResponse.json({ ok: true });
}
