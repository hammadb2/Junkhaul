import { NextResponse } from 'next/server';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { calculatePrice, LOAD_LABELS, PRICING } from '@/lib/pricing';
import { cancelBooking } from '@/lib/cancellations';
import { rescheduleBooking } from '@/lib/reschedule';
import { analysePhotos, analyseDescription } from '@/lib/ai';
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

// ============================================================
// Parse inbound Quo webhook (supports both beta and legacy)
// ============================================================
function parseInbound(payload) {
  // Beta format: data.resource + data.context
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
  // Legacy format: data.object
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
// SMS conversation state — stored in a lightweight table
// We use the messages table to track conversation context
// ============================================================
async function getConversationState(from) {
  // Get last 10 messages from this number to understand context
  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('*')
    .or(`from_number.eq.${from},to_number.eq.${from}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!msgs || msgs.length === 0) return { stage: 'new', lastQuote: null, pendingBooking: null };

  // Look for recent outbound messages to understand what stage we're at
  const recent = msgs.reverse(); // chronological order
  const lastOutbound = [...recent].reverse().find(m => m.direction === 'outbound');
  const lastOutboundBody = (lastOutbound?.body || '').toLowerCase();

  // Check if we recently sent a quote
  if (lastOutboundBody.includes('looking at $') || lastOutboundBody.includes('youre looking at $')) {
    const priceMatch = lastOutbound.body.match(/\$(\d+)/);
    return {
      stage: 'quote_given',
      lastQuote: priceMatch ? parseInt(priceMatch[1]) : null,
      lastOutbound: lastOutbound?.body,
    };
  }

  // Check if we asked for address
  if (lastOutboundBody.includes('whats the address') || lastOutboundBody.includes('whats your address')) {
    return { stage: 'awaiting_address', lastOutbound: lastOutbound?.body };
  }

  // Check if we asked for name
  if (lastOutboundBody.includes('whats your name') || lastOutboundBody.includes('who am i talking to')) {
    return { stage: 'awaiting_name', lastOutbound: lastOutbound?.body };
  }

  // Check if we sent slot options
  if (lastOutboundBody.includes('which slot') || lastOutboundBody.includes('which day')) {
    return { stage: 'awaiting_slot_choice', lastOutbound: lastOutbound?.body };
  }

  // Check if we sent a deposit link
  if (lastOutboundBody.includes('deposit link') || lastOutboundBody.includes('deposit')) {
    return { stage: 'deposit_sent', lastOutbound: lastOutbound?.body };
  }

  return { stage: 'ongoing', lastOutbound: lastOutbound?.body };
}

// ============================================================
// AI: Generate a natural SMS reply based on context
// ============================================================
async function generateReply(from, text, state, booking, photos) {
  const client = getGroq();
  if (!client) return null;

  const hasPhotos = photos && photos.length > 0;

  let systemPrompt = `You are Casey from Junk Haul Calgary, a junk removal company. You're texting a customer. You sound like a real person, not a bot. Short texts, casual, no dashes or weird formatting. You use commas and natural phrasing.

COMPANY INFO:
- Junk removal in Calgary, AB
- Pickups on Thursdays and Sundays
- Same-day available (+$50)
- Licensed and insured, two-man crew
- Prices: single item $99, quarter load $160, half load $240, full load $380
- Freon appliances (fridge, freezer, AC): +$40 each
- Stairs: +$25 per flight
- $50 deposit to book, balance due on pickup day
- Cancel 24+ hours before: full deposit refund
- Cancel within 24 hours: no refund

CURRENT CONVERSATION STATE: ${state.stage}
${state.lastOutbound ? `Last message you sent: "${state.lastOutbound}"` : ''}

${booking ? `CUSTOMER HAS BOOKING: ${booking.booking_ref}, status: ${booking.status}, load: ${booking.load_size}, date: ${booking.job_date}, time: ${booking.job_time}, address: ${booking.address}, total: $${booking.total_price}` : 'No existing booking.'}

${hasPhotos ? `The customer just sent ${photos.length} photo(s). You should acknowledge the photos and tell them you're analyzing them.` : ''}

RULES:
- Keep replies under 160 characters when possible (SMS length)
- Sound human, not robotic
- No dashes in phone numbers or formatting
- Use commas not dashes
- If they want to book, guide them through: what theyre hauling, where, when, then send deposit link
- If they ask about pricing, give real numbers from the company info above
- If they want to cancel/reschedule and have a booking, tell them to reply CANCEL or RESCHEDULE
- If theyre just chatting, be friendly and helpful
- Never say youre an AI or bot
- If they ask for a manager, say "Id be happy to have the manager reach out. Let me get someone on this right now." and flag it`;

  try {
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 300,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Customer texted: "${text}"\n\nReply as Casey:` },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('AI reply failed:', e);
    return null;
  }
}

// ============================================================
// Download photo from URL and convert to base64 for AI analysis
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

// ============================================================
// Upload photo to Supabase storage for permanent reference
// ============================================================
async function uploadPhotoToStorage(base64, bookingId) {
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
    console.error('Photo upload failed:', e);
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
// Create a booking from SMS conversation
// ============================================================
async function createSmsBooking({ name, phone, address, load_size, job_date, job_time, stairs, has_freon, freon_count }) {
  const priced = calculatePrice({ load_size, stairs, has_freon, freon_count, job_date, job_time });
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

  const bookingRef = 'JH-' + Math.random().toString(36).substring(2, 7).toUpperCase();

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
      same_day: false,
      same_day_fee: 0,
      stairs,
      has_freon,
      freon_count,
      freon_fee: priced.freon_fee,
      total_price: priced.total,
      deposit_paid: 0,
      balance_due: priced.balance_due,
      job_date,
      job_time,
      status: 'pending_payment',
      booking_ref: bookingRef,
      source: 'sms',
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Increment slot count
  await supabaseAdmin
    .from('schedule')
    .update({ jobs_booked: slot.jobs_booked + 1 })
    .eq('slot_date', job_date)
    .eq('slot_time', job_time);

  return { success: true, booking };
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

  const { type, from, text, media } = parseInbound(payload);

  // Only act on inbound messages
  if (type && type !== 'message.received') return NextResponse.json({ ok: true });
  if (!from) return NextResponse.json({ ok: true });

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

  // Log inbound message
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
    await sendSMS(from, 'Youre unsubscribed from Junk Haul Calgary texts. Reply START if you want back in.', recentBooking?.id, 'optout');
    return NextResponse.json({ ok: true });
  }
  if (upper === 'HELP') {
    await sendSMS(from, 'Junk Haul Calgary, same-day junk removal. Book at junkhaul.ca or call (587) 325-0751. Reply STOP to opt out.', recentBooking?.id, 'help');
    return NextResponse.json({ ok: true });
  }

  // ── CANCEL ──
  if (upper === 'CANCEL' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    try {
      await cancelBooking(recentBooking.id, 'Customer requested via SMS', 'customer');
    } catch (err) {
      await sendSMS(from, `Sorry, I couldnt cancel booking ${recentBooking.booking_ref}. Please call us.`, recentBooking.id, 'error');
    }
    return NextResponse.json({ ok: true });
  }

  // ── RESCHEDULE ──
  if (upper === 'RESCHEDULE' && recentBooking && recentBooking.status !== 'cancelled' && recentBooking.status !== 'completed') {
    const slots = await getAvailableSlots();
    const nextSlots = slots.slice(0, 4);
    if (nextSlots.length > 0) {
      const slotText = nextSlots.map(s => `${formatDateLong(s.slot_date)} at ${formatTime(s.slot_time)}`).join(', ');
      await sendSMS(from, `To reschedule booking ${recentBooking.booking_ref}, pick one of these slots: ${slotText}. Or call (587) 325-0751.`, recentBooking.id, 'reschedule_options');
    } else {
      await sendSMS(from, `No slots open right now for rescheduling. Call us at (587) 325-0751 and well figure it out.`, recentBooking.id, 'no_slots');
    }
    return NextResponse.json({ ok: true });
  }

  // ── PHOTO HANDLING (MMS) ──
  if (hasPhotos) {
    // Download photos and convert to base64
    const photoBase64s = [];
    const photoUrls = [];
    for (const m of media.slice(0, 3)) {
      if (m.type && m.type.startsWith('image/')) {
        const b64 = await downloadPhotoAsBase64(m.url);
        if (b64) {
          photoBase64s.push(b64);
          // Also upload to our storage
          const storedUrl = await uploadPhotoToStorage(b64, recentBooking?.id);
          if (storedUrl) photoUrls.push(storedUrl);
        }
      }
    }

    if (photoBase64s.length > 0) {
      // Acknowledge receipt immediately
      await sendSMS(from, 'Got your photos! Let me take a look and get you a price.', recentBooking?.id, 'photo_received');

      // Analyze photos
      try {
        const analysis = await analysePhotos(photoBase64s);
        const load_size = analysis.load_size || 'quarter';
        const freon_count = analysis.freon_count || (analysis.has_freon ? 1 : 0);
        const priced = calculatePrice({ load_size, has_freon: analysis.has_freon, freon_count });

        // Build the quote message
        let msg = `Based on your photos, youre looking at a ${LOAD_LABELS[load_size]} — $${priced.total} total.`;
        msg += ` Thats a $50 deposit to book, $${priced.balance_due} due on pickup day.`;
        if (analysis.has_freon && freon_count > 0) {
          msg += ` Includes $${priced.freon_fee} for ${freon_count} freon appliance${freon_count > 1 ? 's' : ''}.`;
        }
        if (analysis.items_detected && analysis.items_detected.length > 0) {
          const items = analysis.items_detected.slice(0, 5).map(i => `${i.quantity}x ${i.name}`).join(', ');
          msg += ` I can see: ${items}.`;
        }
        if (analysis.has_hazmat) {
          msg += ` Heads up: I see some items we cant take (${analysis.hazmat_items?.join(', ') || 'hazardous materials'}). Well need to leave those out.`;
        }
        msg += ` Want to book a pickup? We have slots this Thursday and Sunday.`;

        await sendSMS(from, msg, recentBooking?.id, 'photo_quote');

        // Store the analysis for later use in booking
        await supabaseAdmin.from('messages').insert({
          booking_id: recentBooking?.id || null,
          direction: 'outbound',
          to_number: from,
          from_number: process.env.QUO_PHONE_NUMBER,
          message_type: 'photo_analysis',
          body: JSON.stringify({ analysis, price: priced.total, photoUrls }),
        });

        return NextResponse.json({ ok: true });
      } catch (e) {
        console.error('Photo analysis failed:', e);
        await sendSMS(from, 'I got your photos but Im having trouble analyzing them right now. Can you tell me what youre hauling? Like sofa, fridge, boxes, etc.', recentBooking?.id, 'photo_error');
        return NextResponse.json({ ok: true });
      }
    }
  }

  // ── Get conversation state ──
  const state = await getConversationState(from);

  // ── If we just gave a quote and they say yes/book/sounds good ──
  if (state.stage === 'quote_given' && /^(yes|yeah|yep|sure|book|lets do it|sounds good|do it|im in|lets book|book it|perfect|great|ok|okay)\b/i.test(text || '')) {
    // They want to book! Ask for address
    await sendSMS(from, 'Awesome! Whats the pickup address?', recentBooking?.id, 'booking_ask_address');
    return NextResponse.json({ ok: true });
  }

  // ── If we asked for address and they respond with one ──
  if (state.stage === 'awaiting_address') {
    const address = text?.trim();
    if (address && address.length > 5 && /\d/.test(address)) {
      // Looks like an address, ask for name
      await sendSMS(from, 'Got it. And whats your name?', recentBooking?.id, 'booking_ask_name');
      // Store address in a temp message
      await supabaseAdmin.from('messages').insert({
        booking_id: recentBooking?.id || null,
        direction: 'outbound',
        to_number: from,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: 'temp_address',
        body: address,
      });
      return NextResponse.json({ ok: true });
    }
  }

  // ── If we asked for name and they respond ──
  if (state.stage === 'awaiting_name') {
    const name = text?.trim();
    if (name && name.length > 1 && name.length < 50) {
      // Get the stored address
      const { data: tempMsg } = await supabaseAdmin
        .from('messages')
        .select('body')
        .eq('to_number', from)
        .eq('message_type', 'temp_address')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const address = tempMsg?.body || '';

      // Get available slots
      const slots = await getAvailableSlots();
      if (slots.length === 0) {
        await sendSMS(from, 'Sorry, we dont have any open slots right now. I can add you to the waitlist, or you can check junkhaul.ca/book for cancellations.', null, 'no_slots');
        return NextResponse.json({ ok: true });
      }

      // Show next 4 slots
      const nextSlots = slots.slice(0, 4);
      const slotText = nextSlots.map((s, i) => `Reply ${i + 1} for ${formatDateLong(s.slot_date)} at ${formatTime(s.slot_time)}`).join('. ');
      await sendSMS(from, `Perfect ${name}! Pick a slot: ${slotText}`, null, 'booking_show_slots');

      // Store name + address for booking
      await supabaseAdmin.from('messages').insert({
        direction: 'outbound',
        to_number: from,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: 'temp_name',
        body: name,
      });
      await supabaseAdmin.from('messages').insert({
        direction: 'outbound',
        to_number: from,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: 'temp_slots',
        body: JSON.stringify(nextSlots.map(s => ({ date: s.slot_date, time: s.slot_time }))),
      });

      return NextResponse.json({ ok: true });
    }
  }

  // ── If we showed slots and they reply with a number ──
  if (state.stage === 'awaiting_slot_choice') {
    const choice = parseInt(text?.trim());
    if (choice >= 1 && choice <= 4) {
      // Get stored name, address, and slots
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

        // Get the last quote to determine load size
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
            load_size = parsed.analysis?.load_size || 'quarter';
            has_freon = parsed.analysis?.has_freon || false;
            freon_count = parsed.analysis?.freon_count || 0;
          } catch {}
        }

        // Create the booking
        const result = await createSmsBooking({
          name,
          phone: from,
          address,
          load_size,
          job_date: selectedSlot.date,
          job_time: selectedSlot.time,
          stairs: 0,
          has_freon,
          freon_count,
        });

        if (result.success) {
          // Send deposit link
          await sendDepositLink(result.booking);
          await sendSMS(from, `Booked! Your slot is ${formatDateLong(selectedSlot.date)} at ${formatTime(selectedSlot.time)}. I just sent you a deposit link, $50 to lock it in. Ref: ${result.booking.booking_ref}`, result.booking.id, 'booking_confirmed');

          // Clean up temp messages
          await supabaseAdmin.from('messages')
            .delete()
            .eq('to_number', from)
            .in('message_type', ['temp_name', 'temp_address', 'temp_slots']);

          return NextResponse.json({ ok: true });
        } else {
          await sendSMS(from, `Sorry, that slot just filled up. Want me to find another one?`, null, 'booking_failed');
          return NextResponse.json({ ok: true });
        }
      }
    }
  }

  // ── If they reply to a deposit link ──
  if (state.stage === 'deposit_sent') {
    if (/^(paid|done|paid it|deposit paid|i paid|just paid|completed|finished)\b/i.test(text || '')) {
      await sendSMS(from, 'Perfect, we got it! Youre all booked. Well text you a reminder the day before and when were on the way. Any questions just text or call (587) 325-0751.', recentBooking?.id, 'deposit_confirmed');
      return NextResponse.json({ ok: true });
    }
    if (/^(no|cant|cant afford|later|maybe later|not now|ill do it later)\b/i.test(text || '')) {
      await sendSMS(from, 'No problem, the link doesnt expire. You can pay it whenever youre ready and the slot is yours. Questions? Just text me.', recentBooking?.id, 'deposit_later');
      return NextResponse.json({ ok: true });
    }
  }

  // ── AI fallback for everything else ──
  const aiReply = await generateReply(from, text, state, recentBooking, hasPhotos ? media : null);

  if (aiReply) {
    await sendSMS(from, aiReply, recentBooking?.id, 'ai_reply');
    return NextResponse.json({ ok: true });
  }

  // ── Final fallback ──
  await sendSMS(from, 'Hey, thanks for texting Junk Haul Calgary! Send us a photo of what you need hauled and well get you a price right away. Or call (587) 325-0751.', recentBooking?.id, 'auto_ack');
  await sendSMS(process.env.HAMMAD_PHONE, `Text from ${from}${recentBooking ? ` (${recentBooking.booking_ref}, ${recentBooking.name})` : ''}: "${text}"`, recentBooking?.id, 'inbound_forward');

  return NextResponse.json({ ok: true });
}
