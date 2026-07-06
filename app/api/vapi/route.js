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
    const agentType =
      assistantId === '8a7d8d53-3749-4814-bd36-39239e8a9c86' ? 'sales'
      : assistantId === '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b' ? 'service'
      : assistantId === '204b8b2f-325b-4d2b-95da-613ed0c51c68' ? 'refunds'
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

    // ── Record call history for agent context on future calls ──
    try {
      const summary = generateCallSummary(transcript, agentType, durationSeconds);
      const outcome = determineCallOutcome(transcript, agentType, endedReason);
      const sentiment = detectSentiment(transcript);
      const customerName = extractCustomerName(transcript);

      await supabaseAdmin.from('call_history').insert({
        caller_number: callerNumber,
        caller_name: customerName,
        vapi_call_id: message.call?.id,
        agent_name: assistantName,
        agent_type: agentType,
        duration_seconds: durationSeconds,
        call_outcome: outcome,
        call_summary: summary,
        transcript: transcript.slice(0, 10000),
        sentiment: sentiment,
        ended_reason: endedReason,
        booking_ref: extractBookingRef(transcript),
        follow_up_sent: false,
      });
    } catch (e) {
      console.error('call_history insert failed:', e);
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
  const ASSISTANT_CASEY = '8a7d8d53-3749-4814-bd36-39239e8a9c86';
  const ASSISTANT_JORDAN = '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
  const ASSISTANT_RILEY = '204b8b2f-325b-4d2b-95da-613ed0c51c68';

  if (!callerNumber) {
    return {
      destination: {
        type: 'assistant',
        assistantId: ASSISTANT_CASEY,
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

  let assistantId = ASSISTANT_CASEY; // default: sales

  if (refunds && refunds.length > 0) {
    assistantId = ASSISTANT_RILEY;
  } else if (services && services.length > 0) {
    assistantId = ASSISTANT_JORDAN;
  } else if (bookings && bookings.length > 0) {
    const status = bookings[0].status;
    if (status === 'pending_payment' || status === 'confirmed') {
      assistantId = ASSISTANT_JORDAN;
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

// ============================================================
// Call history helpers — summarise and classify each call
// ============================================================

// Extract the customer's name from the transcript if possible.
// Vapi transcripts typically alternate speaker/role lines.
function extractCustomerName(transcript) {
  if (!transcript) return null;
  const lower = transcript.toLowerCase();

  // Look for "my name is X" patterns
  const nameMatch = transcript.match(/my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) return nameMatch[1];

  // Look for "this is X" patterns
  const thisIsMatch = transcript.match(/(?:^|\.\s|,\s)this is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (thisIsMatch) return thisIsMatch[1];

  // Look for "it's X" / "it is X" patterns
  const itsMatch = transcript.match(/(?:^|\.\s|,\s)it'?s ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (itsMatch) return itsMatch[1];

  return null;
}

// Generate a 1-2 sentence summary of what the call was about.
function generateCallSummary(transcript, agentType, duration) {
  if (!transcript || transcript.trim().length === 0) {
    return `Short ${agentType} call (${duration}s) with no transcript available.`;
  }

  const lower = transcript.toLowerCase();
  const parts = [];

  // Identify what items were discussed
  const items = [];
  const itemKeywords = [
    'sofa', 'couch', 'fridge', 'stove', 'washer', 'dryer', 'mattress',
    'bed', 'table', 'chair', 'desk', 'tv', 'furniture', 'appliance',
    'box', 'bag', 'garbage', 'fridge', 'freezer', 'dishwasher',
    'piano', 'hot tub', 'shed', 'deck', 'fence', 'drywall',
  ];
  for (const item of itemKeywords) {
    if (lower.includes(item)) items.push(item);
  }
  const uniqueItems = [...new Set(items)].slice(0, 4);

  // Identify neighbourhood if mentioned
  const neighbourhoods = [
    'coventry hills', 'country hills', 'panorama hills', 'beddington',
    'thorncliffe', 'greenwood', 'sage hill', 'nolan hill', 'evanston',
    'kincora', 'sherwood', 'royal oak', 'tuscany', 'bowness',
    'crestmont', 'springbank hill', 'cougar ridge', 'west springs',
    'beltline', 'downtown', 'mission', 'inglewood', 'forest lawn',
    'marlborough', 'acadia', 'macleod trail', 'douglasdale', 'mckenzie',
    'mahogany', 'auburn bay', 'seton', 'cranston', 'riverbend',
    'quarry park', 'ogden', 'mill woods', 'forest heights',
  ];
  let neighbourhood = null;
  for (const n of neighbourhoods) {
    if (lower.includes(n)) { neighbourhood = n; break; }
  }

  // Build the summary based on agent type and what happened
  if (agentType === 'sales') {
    if (uniqueItems.length > 0) {
      parts.push(`Customer called about a ${uniqueItems.join(' and ')} pickup`);
    } else {
      parts.push('Customer called about a junk pickup');
    }
    if (neighbourhood) parts[0] += ` in ${neighbourhood}`;

    // Check for quote
    const quoteMatch = transcript.match(/\$(\d{2,5})/);
    if (quoteMatch) {
      parts.push(`Quoted $${quoteMatch[1]}`);
      if (lower.includes('shop around') || lower.includes('think about') || lower.includes('call back')) {
        parts.push('but customer wanted to shop around');
      }
      if (lower.includes('deposit') || lower.includes('booked') || lower.includes('booking')) {
        parts.push('and booking was completed');
      } else {
        parts.push('but no booking was made');
      }
    } else {
      parts.push('No quote was given');
    }
  } else if (agentType === 'service') {
    if (lower.includes('reschedule')) {
      parts.push('Customer called to reschedule their booking');
    } else if (lower.includes('cancel')) {
      parts.push('Customer called to cancel their booking');
    } else if (lower.includes('address') || lower.includes('move')) {
      parts.push('Customer called to change their pickup address');
    } else if (lower.includes('question') || lower.includes('confirm')) {
      parts.push('Customer called with questions about their booking');
    } else {
      parts.push('Customer called about an existing booking');
    }
    const refMatch = transcript.match(/JH-[A-Z0-9]{4,6}/);
    if (refMatch) parts.push(`(ref ${refMatch[0]})`);
  } else if (agentType === 'refunds') {
    if (lower.includes('refund')) {
      parts.push('Customer called about a refund request');
    } else if (lower.includes('complaint') || lower.includes('complain')) {
      parts.push('Customer called to log a complaint');
    } else {
      parts.push('Customer called about a refund or complaint');
    }
    const refMatch = transcript.match(/JH-[A-Z0-9]{4,6}/);
    if (refMatch) parts.push(`for booking ${refMatch[0]}`);
  } else {
    // Unknown / greeter
    if (duration < 15) {
      parts.push('Short call, likely a transfer from the greeter');
    } else {
      parts.push('Customer called in');
    }
  }

  return parts.join('. ') + '.';
}

// Determine the outcome of the call from the transcript.
function determineCallOutcome(transcript, agentType, endedReason) {
  if (!transcript) {
    if (endedReason === 'customer-did-not-answer') return 'no_resolution';
    return 'no_resolution';
  }

  const lower = transcript.toLowerCase();

  // Booking completed — deposit link was sent and customer agreed
  if (lower.includes('deposit link') || lower.includes("i've texted you") ||
      lower.includes("i have texted you") || lower.includes('booking is confirmed') ||
      lower.includes('booking confirmation')) {
    return 'booking_completed';
  }

  // Refund issued
  if (lower.includes('refund') && (lower.includes('processed') || lower.includes('issued') ||
      lower.includes('approved') || lower.includes('sent') || lower.includes('i can refund'))) {
    return 'refund_issued';
  }

  // Complaint logged
  if (lower.includes('complaint') || lower.includes('complain') || lower.includes('unhappy') ||
      lower.includes('not satisfied') || lower.includes('terrible') || lower.includes('awful')) {
    if (!lower.includes('refund')) return 'complaint_logged';
  }

  // Rescheduled
  if (lower.includes('reschedule') && (lower.includes('thursday') || lower.includes('sunday') ||
      lower.includes('moved') || lower.includes('changed') || lower.includes('new date'))) {
    return 'rescheduled';
  }

  // Cancelled
  if (lower.includes('cancel') && (lower.includes('booking') || lower.includes('pickup'))) {
    return 'cancelled';
  }

  // Transferred
  if (lower.includes('transfer') || lower.includes('let me transfer') ||
      lower.includes('hand you over') || lower.includes('connect you')) {
    return 'transferred';
  }

  // Frustrated hangup — short call with frustration keywords
  const frustrationWords = [
    'forget it', 'never mind', 'waste of time', 'this is ridiculous',
    'whatever', 'goodbye', 'useless', 'forget this',
  ];
  if (endedReason && (endedReason.includes('customer') || endedReason === 'hangup')) {
    if (frustrationWords.some((w) => lower.includes(w))) {
      return 'frustrated_hangup';
    }
  }

  // Quote given but no booking
  if (lower.match(/\$\d{2,}/) && !lower.includes('deposit') && !lower.includes('booked')) {
    return 'quote_given_no_booking';
  }

  return 'no_resolution';
}

// Detect sentiment from the transcript based on keywords.
function detectSentiment(transcript) {
  if (!transcript || transcript.trim().length === 0) return 'neutral';
  const lower = transcript.toLowerCase();

  const angryWords = [
    'angry', 'furious', 'outrageous', 'disgusting', 'scam', 'rip off',
    'ripped off', 'ripoff', 'lawyer', 'sue', 'better business bureau',
    'bbb', 'report you', 'this is unacceptable', 'absolutely ridiculous',
  ];
  if (angryWords.some((w) => lower.includes(w))) return 'angry';

  const frustratedWords = [
    'frustrated', 'frustrating', 'annoying', 'ridiculous', 'useless',
    'waste of time', 'forget it', 'never mind', 'this is ridiculous',
    'are you deaf', 'speak up', "can't hear", 'cant hear', 'whatever',
    'not listening', "you're not listening", 'forget this', 'im done',
    'i cant understand', "i can't understand", 'transfer me',
    'let me talk to a human', 'real person',
  ];
  if (frustratedWords.some((w) => lower.includes(w))) return 'frustrated';

  const positiveWords = [
    'great', 'awesome', 'perfect', 'thank you so much', 'thanks',
    'appreciate', 'wonderful', 'amazing', 'love it', 'sounds good',
    'book it', "let's do it", 'perfect', 'excellent', 'fantastic',
    'happy', 'pleased', 'glad',
  ];
  // Count positive word hits — need at least 2 to be confident
  const positiveHits = positiveWords.filter((w) => lower.includes(w)).length;
  if (positiveHits >= 2) return 'positive';

  return 'neutral';
}

// Extract a booking reference (JH-XXXXX) from the transcript if mentioned.
function extractBookingRef(transcript) {
  if (!transcript) return null;
  const match = transcript.match(/JH-[A-Z0-9]{4,6}/);
  return match ? match[0] : null;
}
