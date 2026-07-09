import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runVapiTool } from '@/lib/vapiTools';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Single webhook for all Vapi server events: tool/function calls + call logs.
// Authenticated with the shared VAPI_SERVER_SECRET header.
export async function POST(req) {
  try {
    const secret = req.headers.get('x-vapi-secret');
    const expectedSecret = process.env.VAPI_SERVER_SECRET;
    if (!expectedSecret) {
      console.error('VAPI_SERVER_SECRET is not set — rejecting all webhook calls');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const message = body?.message || {};

  // ── Handoff destination request (from squad handoff tool) ──
  // When the greeter calls handoffToAgent, Vapi asks our server which
  // assistant to hand off to. We look up the customer and route accordingly.
  if (message.type === 'handoff-destination-request') {
    const callerNumber = message.call?.customer?.number ||
                         message.customer?.number ||
                         message.call?.from?.phoneNumber ||
                         '';
    const routing = await determineHandoffDestination(callerNumber);
    return NextResponse.json(routing);
  }

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

  // ── End-of-call report: log the call + send follow-up SMS ──
  if (message.type === 'end-of-call-report') {
    const callerNumber = message.customer?.number ||
                         message.call?.customer?.number ||
                         message.customer?.num ||
                         null;
    const durationSeconds = message.durationSeconds ? Math.round(message.durationSeconds) : 0;
    const endedReason = message.endedReason || null;
    const transcript = message.transcript || message.artifact?.transcript || '';
    const assistantId = message.assistant?.id || message.assistantId || '';
    const assistantName = message.assistant?.name || '';
    const SALES_ID = process.env.VAPI_BOOKING_AGENT_ID || '8a7d8d53-3749-4814-bd36-39239e8a9c86';
    const SERVICE_ID = process.env.VAPI_CS_AGENT_ID || '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
    const REFUNDS_ID = '204b8b2f-325b-4d2b-95da-613ed0c51c68';
    const agentType =
      assistantId === SALES_ID ? 'sales'
      : assistantId === SERVICE_ID ? 'service'
      : assistantId === REFUNDS_ID ? 'refunds'
      : assistantName === 'Casey' ? 'sales'
      : assistantName === 'Jordan' ? 'service'
      : assistantName === 'Riley' ? 'refunds'
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

    // ── Send SMS on every customer-initiated hangup ──
    // If the customer hung up (not the agent, not an error), send a
    // follow-up text. The message depends on what happened on the call.
    const customerHungUp = endedReason === 'customer-ended-call' ||
                           endedReason === 'customer-hung-up' ||
                           endedReason === 'hangup' ||
                           endedReason === 'customer-did-not-answer';

    // Check if a booking was actually completed on this call
    const bookingCompleted = transcript.toLowerCase().includes('deposit link') &&
                             transcript.toLowerCase().includes('texted you');

    // Check if this was a transfer from the greeter (short, no real conversation)
    const wasGreeterTransfer = durationSeconds < 15 && agentType === 'unknown';

    if (callerNumber && customerHungUp && !bookingCompleted && !wasGreeterTransfer) {
      try {
        const isFrustrated = detectFrustration(durationSeconds, endedReason, transcript, agentType);
        const smsMsg = isFrustrated
          ? buildApologyMessage(agentType, transcript)
          : buildFollowUpMessage(agentType, transcript, durationSeconds);
        await sendSMS(callerNumber, smsMsg, null, isFrustrated ? 'frustrated_hangup' : 'follow_up');
        console.log(`Sent ${isFrustrated ? 'frustration apology' : 'follow-up'} SMS to`, callerNumber);
      } catch (e) {
        console.error('Failed to send hangup SMS:', e);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Vapi webhook error:', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// ============================================================
// Frustration detection: was this call ended out of frustration?
// ============================================================
function detectFrustration(duration, endedReason, transcript, agentType) {
  // Customer hung up
  const customerHungUp = endedReason === 'customer-hung-up' ||
                         endedReason === 'customer-ended-call' ||
                         endedReason === 'hangup';
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
// Build a follow-up SMS for normal hangups (not frustrated)
// ============================================================
function buildFollowUpMessage(agentType, transcript, duration) {
  // Sales calls — they were interested but didn't finish booking
  if (agentType === 'sales') {
    // If they got a quote but didn't book
    if (transcript.match(/\$\d{2,}/)) {
      return "Hey, thanks for calling Junk Haul Calgary! If you're ready to book your pickup you can do it online at junkhaul.ca/book or just call us back. We've got slots open this Thursday and Sunday. Talk soon!";
    }
    // If they were just asking questions
    return "Hey, thanks for calling Junk Haul Calgary! If you'd like to book a pickup you can do it online at junkhaul.ca/book anytime, takes about 2 minutes. Or call us back and we'll get you sorted. Have a good one!";
  }

  // Service calls — they have an existing booking
  if (agentType === 'service') {
    return "Hey, thanks for calling Junk Haul Calgary! If you need to reschedule, change your address, or have any questions about your booking, you can do it online at junkhaul.ca/service or call us back. We're here to help!";
  }

  // Refund calls
  if (agentType === 'refunds') {
    return "Hey, thanks for calling Junk Haul Calgary! If you need to submit or check on a refund request, you can do it online at junkhaul.ca/refund. Our team processes requests within 24 hours. Sorry for any inconvenience!";
  }

  // Unknown agent type
  return "Hey, thanks for calling Junk Haul Calgary! If you'd like to book a junk pickup, visit junkhaul.ca/book or call us back. Have a great day!";
}

// ============================================================
// Build a personalized apology SMS for frustrated hangups
// ============================================================
function buildApologyMessage(agentType, transcript) {
  if (agentType === 'sales') {
    // Check if they were trying to book
    if (transcript.toLowerCase().includes('book') || transcript.toLowerCase().includes('pickup') || transcript.toLowerCase().includes('junk')) {
      return "Hey, this is Junk Haul Calgary. Really sorry about the call just now, it sounded like you were trying to book a pickup. You can book online anytime at junkhaul.ca/book, takes 2 minutes. Or call us back and we'll make sure to get you sorted. Sorry for the hassle!";
    }
    return "Hey, this is Junk Haul Calgary. Really sorry about the call just now, I know that was frustrating. If you're looking to book a junk pickup you can do it online at junkhaul.ca/book anytime. Sorry again for the trouble!";
  }

  if (agentType === 'service') {
    return "Hey, this is Junk Haul Calgary. Really sorry about the call just now. If you need to reschedule, cancel, or have questions about your booking, you can do it online at junkhaul.ca/service or call us back. We'll make it right. Sorry for the frustration!";
  }

  if (agentType === 'refunds') {
    return "Hey, this is Junk Haul Calgary. Really sorry about the call just now. If you're looking for a refund, you can submit a request online at junkhaul.ca/refund and our team will process it within 24 hours. Sorry for the hassle, we take every complaint seriously.";
  }

  return "Hey, this is Junk Haul Calgary. Really sorry about the call just now. You can reach us online at junkhaul.ca or call us back. Sorry for the trouble!";
}

// ============================================================
// Determine which assistant to hand off to (squad handoff)
// ============================================================
async function determineHandoffDestination(callerNumber) {
  const SALES_ID = process.env.VAPI_BOOKING_AGENT_ID || '8a7d8d53-3749-4814-bd36-39239e8a9c86';
  const SERVICE_ID = process.env.VAPI_CS_AGENT_ID || '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
  const REFUNDS_ID = '204b8b2f-325b-4d2b-95da-613ed0c51c68';

  if (!callerNumber) {
    return {
      destination: {
        type: 'assistant',
        assistantId: SALES_ID,
        contextEngineeringPlan: { type: 'all' },
      },
    };
  }

  const normalizedPhone = callerNumber.replace(/^\+1/, '').replace(/\D/g, '');
  const phonePatterns = [
    callerNumber,
    `+1${normalizedPhone}`,
    `1${normalizedPhone}`,
    normalizedPhone,
  ];

  // Check bookings
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  // Check refund requests
  const { data: refunds } = await supabaseAdmin
    .from('refund_requests')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  // Check service requests
  const { data: services } = await supabaseAdmin
    .from('service_requests')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  let assistantId = SALES_ID; // default: sales/booking

  if (refunds && refunds.length > 0) {
    assistantId = REFUNDS_ID;
  } else if (services && services.length > 0) {
    assistantId = SERVICE_ID;
  } else if (bookings && bookings.length > 0) {
    const status = bookings[0].status;
    if (status === 'pending_payment' || status === 'confirmed') {
      assistantId = SERVICE_ID;
    }
  }

  // Build variable values for the destination assistant
  const variableValues = {};
  if (bookings && bookings.length > 0) {
    const b = bookings[0];
    variableValues.customer_first_name = b.name?.split(' ')[0] || 'there';
    variableValues.customer_name = b.name || '';
    variableValues.has_booking = 'true';
    variableValues.booking_ref = b.booking_ref || '';
    variableValues.booking_status = b.status || '';
    variableValues.booking_load_size = b.load_size || '';
    variableValues.booking_date = b.job_date || '';
    variableValues.booking_time = b.job_time || '';
    variableValues.booking_address = b.address || '';
    variableValues.booking_total = b.total_price ? String(b.total_price) : '';
    variableValues.booking_balance = b.balance_due ? String(b.balance_due) : '';
    variableValues.is_returning_customer = 'true';
  } else {
    variableValues.customer_first_name = 'there';
    variableValues.has_booking = 'false';
    variableValues.is_returning_customer = 'false';
  }

  return {
    destination: {
      type: 'assistant',
      assistantId,
      contextEngineeringPlan: { type: 'all' },
      assistantOverrides: {
        variableValues,
      },
    },
  };
}
