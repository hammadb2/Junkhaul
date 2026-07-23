import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { groqToolCallCompletion, analysePhotos, analyseDescription, handleSafetyAlert } from '@/lib/ai';
import { CHAT_BOOKING_TOOL_SCHEMAS, runChatBookingTool } from '@/lib/chatBookingTools';
import { checkWeightFlag } from '@/lib/pricing';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_TOOL_ITERATIONS = 4;

// analysePhotos/analyseDescription return confidence as a string
// (high/medium/low) — the booking pipeline's ai_confidence field is
// numeric (0-1), used in evidence/confidence scoring (see
// lib/quoteDecision.js). Map to a reasonable numeric equivalent rather
// than storing the raw string.
function numericConfidence(confidence) {
  return { high: 0.9, medium: 0.6, low: 0.3 }[confidence] ?? 0.5;
}

const SYSTEM_PROMPT = `You are Junk Haul Calgary's booking assistant, chatting with a customer on our website. Be warm, brief, and conversational — this is a text chat, not a form. Ask ONE question at a time.

Your job, in order:
1. Find out what they need hauled away. If they describe it in words, that's enough to continue (photo analysis happens automatically if they attach a photo — you don't need to ask for one, but you can suggest it improves accuracy).
2. Ask for their address (needed for an accurate quote — price depends on real distance).
3. Ask about stairs (how many flights) and whether there's a fridge/freezer/AC unit/water cooler (freon appliances cost extra).
4. Ask if they need it same-day (rush fee applies) or can pick a date.
5. Call check_availability to see open slots, and let them pick one.
6. Once you have load size + address + stairs + freon + a date/time, call get_quote and tell them the price plainly (total, $50 deposit, balance on pickup day). Never make up a price yourself — always call get_quote first.
7. If they want to book, get their name and phone number, then call create_booking. After it succeeds, tell them to complete the $50 deposit in the payment box that will appear.

Rules:
- Never invent a price — always call get_quote (or let create_booking return the real numbers).
- Never call create_booking without an explicit "yes, book it" from the customer, and never without name, phone, address, load size, and a confirmed date/time.
- If get_quote or create_booking returns an error, explain it plainly and ask what to do differently (e.g. a different time slot).
- If asked something outside booking a junk pickup (refunds, rescheduling, cancelling an existing booking), tell them to call/text (587) 325-0751 for that — this chat only handles new bookings.`;

async function loadOrCreateSession(sessionId) {
  const { data: existing } = await supabaseAdmin.from('chat_booking_sessions').select('*').eq('session_id', sessionId).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabaseAdmin
    .from('chat_booking_sessions')
    .insert({ session_id: sessionId, messages: [{ role: 'system', content: SYSTEM_PROMPT }], collected_data: {} })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { session_id, message = '', photos = [] } = body;
    if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 422 });

    // Unauthenticated LLM (+ vision, when photos are attached) loop with no
    // other gate (audit B10) -- an unbounded cost-abuse vector. Session-scoped
    // covers one runaway conversation; IP-scoped covers one caller cycling
    // through many session_ids.
    assertRateLimit({ scope: 'chat_booking_session', key: session_id, limit: 30, windowMs: 60 * 60 * 1000 });
    assertRateLimit({ scope: 'chat_booking_ip', key: getClientKey(req), limit: 60, windowMs: 60 * 60 * 1000 });

    const session = await loadOrCreateSession(session_id);
    const messages = Array.isArray(session.messages) ? [...session.messages] : [{ role: 'system', content: SYSTEM_PROMPT }];
    const collectedData = { ...(session.collected_data || {}) };

    // Photo/description analysis is done directly by our own code, not
    // left to the LLM to decide whether to call a tool for it — more
    // reliable, and avoids routing large image payloads through
    // function-call arguments. Result is injected as a system message so
    // the model reads it as ordinary conversation context.
    if (photos.length > 0 || (message && message.trim().length > 12 && !collectedData.ai_load_estimate)) {
      try {
        const analysis = photos.length > 0 ? await analysePhotos(photos) : await analyseDescription(message);
        if (analysis.photo_unusable) {
          messages.push({ role: 'user', content: message || '[photo attached]' });
          messages.push({ role: 'system', content: "The photo wasn't usable — ask the customer to retake it. Don't say why." });
        } else {
          await handleSafetyAlert(analysis, { source: 'chat_booking', session_id });
          collectedData.ai_load_estimate = analysis.load_size || collectedData.ai_load_estimate;
          collectedData.ai_weight_estimate_kg = analysis.estimated_weight_kg || collectedData.ai_weight_estimate_kg;
          collectedData.ai_volume_estimate_cuft = analysis.estimated_volume_cuft || collectedData.ai_volume_estimate_cuft;
          collectedData.ai_confidence = analysis.confidence != null ? numericConfidence(analysis.confidence) : collectedData.ai_confidence;
          collectedData.has_hazmat = Boolean(analysis.has_hazmat) || collectedData.has_hazmat || false;
          collectedData.hazmat_description = analysis.hazmat_description || collectedData.hazmat_description || null;
          collectedData.description_text = message || collectedData.description_text || null;
          collectedData.photos = photos.length > 0 ? photos : collectedData.photos;
          if (photos.length > 0) collectedData.has_freon = analysis.has_freon || collectedData.has_freon;
          if (photos.length > 0) collectedData.freon_count = analysis.freon_count || collectedData.freon_count;

          const weightFlag = checkWeightFlag(analysis.load_size, analysis.estimated_weight_kg);
          messages.push({ role: 'user', content: message || '[photo attached]' });
          messages.push({
            role: 'system',
            content: `Analysis result: load size "${analysis.load_size}", estimated weight ${analysis.estimated_weight_kg || 'unknown'}kg${analysis.has_freon ? `, ${analysis.freon_count || 1} freon appliance(s) detected` : ''}${analysis.has_hazmat ? `, HAZARD: ${analysis.hazmat_description}` : ''}${weightFlag.flag ? `, WEIGHT WARNING: ${weightFlag.reason}` : ''}. Confirm this with the customer in plain language, don't repeat raw numbers robotically.`,
          });
        }
      } catch (e) {
        console.error('[chat-booking] analysis failed:', e.message);
        messages.push({ role: 'user', content: message || '[photo attached]' });
        messages.push({ role: 'system', content: 'Analysis is temporarily unavailable — ask the customer to describe the items in words instead so you can continue.' });
      }
    } else if (message) {
      messages.push({ role: 'user', content: message });
    }

    // Tool-calling loop.
    let finalReply = null;
    let toolResultPayload = {};
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { message: assistantMessage, finish_reason } = await groqToolCallCompletion(messages, CHAT_BOOKING_TOOL_SCHEMAS);
      if (!assistantMessage) throw new Error('No response from assistant');
      messages.push(assistantMessage);

      if (finish_reason === 'tool_calls' && assistantMessage.tool_calls?.length) {
        for (const call of assistantMessage.tool_calls) {
          // Groq can return a literal JSON "null" (not just an empty/missing
          // string) for a tool called with no arguments — a default
          // parameter (`= {}`) only covers `undefined`, not `null`, so the
          // tool functions' own destructuring would crash on it. Guard here
          // once, centrally, rather than in every tool function.
          let args = {};
          try { args = JSON.parse(call.function.arguments || '{}') ?? {}; } catch { /* keep empty */ }
          const result = await runChatBookingTool(call.function.name, args, {
            ...collectedData,
            sessionId: session_id,
          });
          if (call.function.name === 'create_booking' && result.booking_id) {
            toolResultPayload = { booking: result };
            collectedData.booking_id = result.booking_id;
          }
          if (call.function.name === 'get_quote' && !result.error) {
            toolResultPayload = { ...toolResultPayload, quote: result };
          }
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue; // let the model see tool results and respond
      }

      finalReply = assistantMessage.content || "Sorry, could you say that again?";
      break;
    }

    await supabaseAdmin
      .from('chat_booking_sessions')
      .update({
        messages,
        collected_data: collectedData,
        status: toolResultPayload.booking ? 'completed' : 'active',
        booking_id: toolResultPayload.booking?.booking_id || session.booking_id || null,
      })
      .eq('id', session.id);

    return NextResponse.json({
      reply: finalReply || "Let's get you a quote — what do you need hauled away?",
      ...toolResultPayload,
    });
  } catch (err) {
    if (err.status === 429) {
      return NextResponse.json(
        { error: "You're sending messages a bit fast — give it a moment and try again." },
        { status: 429, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
      );
    }
    console.error('chat-booking error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again or call (587) 325-0751.' }, { status: 500 });
  }
}
