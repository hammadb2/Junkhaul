import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runVapiTool } from '@/lib/vapiTools';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Single webhook for all Vapi server events: tool/function calls + call logs.
// Authenticated with the shared VAPI_SERVER_SECRET header.
export async function POST(req) {
  const secret = req.headers.get('x-vapi-secret');
  if (process.env.VAPI_SERVER_SECRET && secret !== process.env.VAPI_SERVER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const message = body?.message || {};

  // ── Tool calls (current Vapi format) ──
  if (message.type === 'tool-calls' && Array.isArray(message.toolCallList)) {
    const results = [];
    for (const call of message.toolCallList) {
      const name = call.function?.name || call.name;
      let args = call.function?.arguments ?? call.arguments ?? {};
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch { args = {}; }
      }
      const result = await runVapiTool(name, args);
      results.push({ toolCallId: call.id, result });
    }
    return NextResponse.json({ results });
  }

  // ── Legacy single function-call format ──
  if (message.type === 'function-call' && message.functionCall) {
    let args = message.functionCall.parameters ?? {};
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch { args = {}; }
    }
    const result = await runVapiTool(message.functionCall.name, args);
    return NextResponse.json({ result });
  }

  // ── End-of-call report: log the call + detect frustrated hangups ──
  if (message.type === 'end-of-call-report') {
    const callerNumber = message.customer?.number || message.call?.customer?.number || null;
    const durationSeconds = message.durationSeconds ? Math.round(message.durationSeconds) : 0;
    const endedReason = message.endedReason || null;
    const transcript = message.transcript || '';
    const agentType =
      message.assistant?.id === process.env.VAPI_BOOKING_AGENT_ID ? 'sales'
      : message.assistant?.id === process.env.VAPI_CS_AGENT_ID ? 'service'
      : message.assistant?.name === 'Riley' ? 'refunds'
      : 'unknown';

    try {
      await supabaseAdmin.from('phone_calls').insert({
        vapi_call_id: message.call?.id || null,
        caller_number: callerNumber,
        direction: message.call?.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
        duration_seconds: durationSeconds,
        cost_usd: message.cost || null,
        transcript,
        outcome: endedReason,
        agent_type: agentType,
      });
    } catch (e) {
      console.error('phone_calls log failed:', e);
    }

    // Detect frustrated hangup: short call + customer-initiated hangup
    // Signs of frustration: call < 60 seconds, ended by customer, transcript shows frustration
    const isFrustratedHangup = detectFrustration(durationSeconds, endedReason, transcript, agentType);

    if (isFrustratedHangup && callerNumber) {
      try {
        const apologyMsg = buildApologyMessage(agentType, transcript);
        await sendSMS(callerNumber, apologyMsg, null, 'frustrated_hangup');
        console.log('Sent frustration apology SMS to', callerNumber);
      } catch (e) {
        console.error('Failed to send apology SMS:', e);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// ============================================================
// Frustration detection: was this call ended out of frustration?
// ============================================================
function detectFrustration(duration, endedReason, transcript, agentType) {
  // Customer hung up
  const customerHungUp = endedReason === 'customer-hung-up' || endedReason === 'customer-ended-call';
  if (!customerHungUp) return false;

  // Very short calls (< 30s) that the customer ended = likely frustrated
  if (duration < 30) return true;

  // Check transcript for frustration keywords
  const lowerTranscript = transcript.toLowerCase();
  const frustrationWords = [
    'forget it', 'never mind', 'this is useless', 'waste of time',
    'cant hear', "can't hear", 'youre not listening', "you're not listening",
    'forget this', 'im done', 'goodbye', 'bye', 'whatever',
    'this is ridiculous', 'are you deaf', 'speak up',
    'i cant understand you', "i can't understand you",
    'transfer me', 'let me talk to a human', 'give me a real person',
  ];
  if (frustrationWords.some((w) => lowerTranscript.includes(w))) return true;

  // If the assistant asked "can you speak up" multiple times = communication issue
  const speakUpCount = (lowerTranscript.match(/speak up|cant hear|didn't catch/g) || []).length;
  if (speakUpCount >= 2) return true;

  return false;
}

// ============================================================
// Build a personalized apology SMS based on what happened
// ============================================================
function buildApologyMessage(agentType, transcript) {
  const base = 'Hi, this is Junk Haul Calgary. ';

  if (agentType === 'sales') {
    // Check if they were trying to book
    if (transcript.toLowerCase().includes('book') || transcript.toLowerCase().includes('pickup') || transcript.toLowerCase().includes('junk')) {
      return base + "I'm sorry our call got cut short - it sounded like you were trying to book a pickup. You can book online anytime at junkhaul.ca/book - it takes 2 minutes. Or call us back and we'll make sure to get you sorted. Sorry for the hassle!";
    }
    return base + "I'm sorry about the call just now - I know that was frustrating. If you're looking to book a junk pickup, you can do it online at junkhaul.ca/book anytime. Sorry again for the trouble!";
  }

  if (agentType === 'service') {
    return base + "I'm sorry about the call just now. If you need to reschedule, cancel, or have questions about your booking, you can do it online at junkhaul.ca/service or call us back. We'll make it right. Sorry for the frustration!";
  }

  if (agentType === 'refunds') {
    return base + "I'm sorry about the call just now. If you're looking for a refund, you can submit a request online at junkhaul.ca/refund and our team will process it within 24 hours. Sorry for the hassle - we take every complaint seriously.";
  }

  return base + "I'm sorry about the call just now. You can reach us online at junkhaul.ca or call us back. Sorry for the trouble!";
}
