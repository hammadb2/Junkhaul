// ============================================================
// AI AGENT — Functional DeepSeek-powered agent that takes actions.
//
// This is NOT just a narrator. It can:
//   - Send SMS to customers or crew
//   - Trigger VAPI outbound calls (sales/service/refunds agents)
//   - Look up and update bookings
//   - Cancel / reschedule bookings
//   - Adjust config (kill switches, pricing, surge)
//   - Create opportunistic offers
//   - Add customers to waitlist
//   - Send emails
//   - Query operational data (today's jobs, revenue, cron health)
//   - Escalate issues to the operator
//
// Flow:
//   1. User (admin) sends a message via the Command Center chat
//   2. We gather live operational context (same as command center)
//   3. We send the message + context + tool definitions to DeepSeek
//   4. DeepSeek responds with text and/or tool_calls
//   5. We execute any tool_calls locally and return results
//   6. If tool_calls were made, we send results back to DeepSeek for a final response
//   7. We log all actions to ai_agent_actions table
// ============================================================

import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { callDeepSeek } from './deepseek';
import { edmontonNowParts } from './dates';
import { cancelBooking } from './cancellations';
import { rescheduleBooking } from './reschedule';
import { addToWaitlist } from './waitlist';
import { getPricingConfig, calculatePrice, LOAD_LABELS } from './pricing';
import { getNumberConfig, getBooleanConfig, invalidateConfigCache } from './config';
import { isKillSwitchOn, logEvent } from './audit';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca';
const OPERATOR_PHONE = process.env.HAMMAD_PHONE || '+18259458282';

// ============================================================
// TOOL DEFINITIONS — what the AI agent can do
// ============================================================
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_sms',
      description: 'Send an SMS message to a phone number. Use for customer follow-ups, crew instructions, or operator alerts.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Phone number in E.164 format, e.g. +15873250751' },
          message: { type: 'string', description: 'The SMS message content' },
          category: { type: 'string', description: 'Message category for logging', enum: ['customer_followup', 'crew_instruction', 'operator_alert', 'offer', 'reminder', 'other'] },
        },
        required: ['phone', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'call_customer',
      description: 'Trigger a VAPI outbound call to a customer. The AI voice agent (Casey/Jordan/Riley) will call them and handle the conversation.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Customer phone number in E.164 format' },
          agent_type: { type: 'string', enum: ['sales', 'service', 'refunds'], description: 'Which AI agent to use: sales=booking/new business, service=existing booking changes, refunds=refund requests' },
          context: { type: 'string', description: 'Context about why we are calling, so the voice agent knows the situation' },
        },
        required: ['phone', 'agent_type', 'context'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_booking',
      description: 'Look up a booking by reference code or phone number. Returns full booking details.',
      parameters: {
        type: 'object',
        properties: {
          booking_ref: { type: 'string', description: 'Booking reference code, e.g. JH-AB12' },
          phone: { type: 'string', description: 'Customer phone number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_booking',
      description: 'Cancel a booking by its reference code. Applies the cancellation policy automatically (refund if >24h before pickup).',
      parameters: {
        type: 'object',
        properties: {
          booking_ref: { type: 'string', description: 'Booking reference code' },
          reason: { type: 'string', description: 'Reason for cancellation' },
        },
        required: ['booking_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_booking',
      description: 'Reschedule a booking to a new date and time. Only Thursdays and Sundays are valid.',
      parameters: {
        type: 'object',
        properties: {
          booking_ref: { type: 'string', description: 'Booking reference code' },
          new_date: { type: 'string', description: 'New date YYYY-MM-DD (must be Thursday or Sunday)' },
          new_time: { type: 'string', description: 'New time HH:MM 24h format' },
        },
        required: ['booking_ref', 'new_date', 'new_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_config',
      description: 'Update a system configuration value. Use to toggle kill switches, adjust pricing, change surge multipliers, etc. Changes take effect immediately.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'The config key to update, e.g. kill_switch_abandonment_followup, surge_base_multiplier, pricing_base_half_load' },
          value: { type: 'string', description: 'The new value as a string (true/false for booleans, numbers as strings)' },
          reason: { type: 'string', description: 'Why this change is being made (for audit log)' },
        },
        required: ['key', 'value', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_waitlist',
      description: 'Add a customer to the waitlist when no slots are available.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          preferred_day_type: { type: 'string', enum: ['thursday', 'sunday', 'either'] },
          load_size: { type: 'string', enum: ['single_item', 'quarter', 'half', 'full'] },
          address: { type: 'string' },
        },
        required: ['name', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to a customer or team member.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Email body text' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_summary',
      description: 'Get a live summary of today\'s operations: jobs, revenue, surge, pending offers, urgent calls, cron health.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Get available pickup slots for upcoming days.',
      parameters: {
        type: 'object',
        properties: {
          day_type: { type: 'string', enum: ['thursday', 'sunday'], description: 'Filter by day type' },
          date: { type: 'string', description: 'Specific date YYYY-MM-DD' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_operator',
      description: 'Send an urgent SMS to the operator (Hammad) about an issue that needs human attention.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'What the operator needs to know' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_timeline',
      description: 'Get the full event timeline for a booking (SMS, surge, offers, status changes).',
      parameters: {
        type: 'object',
        properties: {
          booking_ref: { type: 'string', description: 'Booking reference code' },
        },
        required: ['booking_ref'],
      },
    },
  },
];

// ============================================================
// TOOL EXECUTION — run the tool the AI requested
// ============================================================
async function executeTool(name, args) {
  switch (name) {
    case 'send_sms':
      return await toolSendSMS(args);
    case 'call_customer':
      return await toolCallCustomer(args);
    case 'lookup_booking':
      return await toolLookupBooking(args);
    case 'cancel_booking':
      return await toolCancelBooking(args);
    case 'reschedule_booking':
      return await toolRescheduleBooking(args);
    case 'update_config':
      return await toolUpdateConfig(args);
    case 'add_to_waitlist':
      return await toolAddToWaitlist(args);
    case 'send_email':
      return await toolSendEmail(args);
    case 'get_today_summary':
      return await toolGetTodaySummary();
    case 'get_schedule':
      return await toolGetSchedule(args);
    case 'escalate_to_operator':
      return await toolEscalateToOperator(args);
    case 'get_booking_timeline':
      return await toolGetBookingTimeline(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- Tool implementations ---

async function toolSendSMS({ phone, message, category }) {
  try {
    await sendSMS(phone, message, null, category || 'ai_agent');
    await logAction('send_sms', { phone, message, category }, true);
    return { success: true, message: `SMS sent to ${phone}` };
  } catch (e) {
    await logAction('send_sms', { phone, message, category }, false, e.message);
    return { error: `Failed to send SMS: ${e.message}` };
  }
}

async function toolCallCustomer({ phone, agent_type, context }) {
  try {
    const res = await fetch(`${SITE}/api/vapi-outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': process.env.VAPI_SERVER_SECRET || '',
      },
      body: JSON.stringify({ phone, agent_type, context }),
    });
    const data = await res.json();
    if (res.ok) {
      await logAction('call_customer', { phone, agent_type, context }, true);
      return { success: true, message: `Call initiated to ${phone} with ${agent_type} agent`, call_id: data.call_id };
    } else {
      await logAction('call_customer', { phone, agent_type, context }, false, data.error);
      return { error: `Call failed: ${data.error || 'Unknown error'}` };
    }
  } catch (e) {
    await logAction('call_customer', { phone, agent_type, context }, false, e.message);
    return { error: `Call failed: ${e.message}` };
  }
}

async function toolLookupBooking({ booking_ref, phone }) {
  try {
    let q = supabaseAdmin.from('bookings').select('*');
    if (booking_ref) {
      q = q.eq('booking_ref', booking_ref.toUpperCase());
    } else if (phone) {
      const normalized = phone.replace(/\D/g, '');
      const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
      q = q.or(patterns.map(p => `phone.eq.${p}`).join(','));
    } else {
      return { error: 'Need booking_ref or phone' };
    }
    const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: 'No booking found' };
    return {
      booking_ref: data.booking_ref,
      name: data.name,
      phone: data.phone,
      address: data.address,
      load_size: data.load_size,
      job_date: data.job_date,
      job_time: data.job_time,
      status: data.status,
      total_price: data.total_price,
      balance_due: data.balance_due,
      deposit_paid: data.deposit_paid,
      payment_status: data.payment_status,
      surge_mode: data.surge_mode,
      has_freon: data.has_freon,
      stairs: data.stairs,
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function toolCancelBooking({ booking_ref, reason }) {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!booking) return { error: 'Booking not found' };
    const result = await cancelBooking(booking.id, reason || 'Cancelled by AI agent', 'operator');
    await logAction('cancel_booking', { booking_ref, reason }, true);
    return {
      success: true,
      refunded: result.policy?.deposit_refunded || false,
      message: result.policy?.deposit_refunded
        ? `Booking ${booking_ref} cancelled. $50 deposit will be refunded.`
        : `Booking ${booking_ref} cancelled. Deposit is non-refundable (within 24h).`,
    };
  } catch (e) {
    await logAction('cancel_booking', { booking_ref, reason }, false, e.message);
    return { error: e.message };
  }
}

async function toolRescheduleBooking({ booking_ref, new_date, new_time }) {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!booking) return { error: 'Booking not found' };
    const result = await rescheduleBooking(booking.id, new_date, new_time);
    if (result.success) {
      await logAction('reschedule_booking', { booking_ref, new_date, new_time }, true);
      return { success: true, message: `Booking ${booking_ref} rescheduled to ${new_date} at ${new_time}` };
    }
    return { error: result.error || 'Reschedule failed' };
  } catch (e) {
    await logAction('reschedule_booking', { booking_ref, new_date, new_time }, false, e.message);
    return { error: e.message };
  }
}

async function toolUpdateConfig({ key, value, reason }) {
  try {
    // Determine value type
    const original = await supabaseAdmin
      .from('system_config')
      .select('value_type, description, category')
      .eq('key', key)
      .maybeSingle();

    const valueType = original.data?.value_type || (value === 'true' || value === 'false' ? 'boolean' : !isNaN(Number(value)) ? 'number' : 'string');

    const { error } = await supabaseAdmin
      .from('system_config')
      .upsert({
        key,
        value,
        value_type: valueType,
        description: original.data?.description || '',
        category: original.data?.category || 'general',
        updated_by: 'ai_agent',
        updated_at: new Date().toISOString(),
      });

    if (error) return { error: error.message };

    // Invalidate cache so the change takes effect immediately
    invalidateConfigCache();

    await logAction('update_config', { key, value, reason }, true);
    await logEvent('config_changed', { key, old_value: null, new_value: value, reason, changed_by: 'ai_agent' });
    return { success: true, message: `Config "${key}" updated to "${value}". Reason: ${reason}. Change is live.` };
  } catch (e) {
    await logAction('update_config', { key, value, reason }, false, e.message);
    return { error: e.message };
  }
}

async function toolAddToWaitlist({ name, phone, preferred_day_type, load_size, address }) {
  try {
    await addToWaitlist({ name, phone, preferred_day_type: preferred_day_type || 'either', load_size, address });
    await logAction('add_to_waitlist', { name, phone }, true);
    return { success: true, message: `${name} added to waitlist. We'll text ${phone} when a slot opens.` };
  } catch (e) {
    await logAction('add_to_waitlist', { name, phone }, false, e.message);
    return { error: e.message };
  }
}

async function toolSendEmail({ to, subject, body }) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { error: 'Email sending not configured (RESEND_API_KEY not set)' };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Junk Haul Calgary <support@junkhaul.ca>',
        reply_to: 'contact@junkhaul.ca',
        to,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Email failed: ${err}` };
    }

    await logAction('send_email', { to, subject }, true);
    return { success: true, message: `Email sent to ${to}` };
  } catch (e) {
    await logAction('send_email', { to, subject }, false, e.message);
    return { error: e.message };
  }
}

async function toolGetTodaySummary() {
  const { date: today } = edmontonNowParts();
  const { data: jobs } = await supabaseAdmin
    .from('bookings')
    .select('name, load_size, job_time, status, total_price, balance_due, payment_status, surge_mode')
    .eq('job_date', today)
    .in('status', ['confirmed', 'completed', 'rescheduled']);

  const jobList = jobs || [];
  const revenueToCollect = jobList.reduce((s, b) => s + (b.balance_due || 0), 0);
  const revenueCollected = jobList.filter(b => b.status === 'completed' && b.payment_status === 'paid').reduce((s, b) => s + b.total_price, 0);

  const now = new Date().toISOString();
  const { data: pendingOffers } = await supabaseAdmin
    .from('nearby_offers')
    .select('customer_phone, original_price, discounted_price, discount_percent, offer_expires_at')
    .gt('offer_expires_at', now)
    .order('created_at', { ascending: false })
    .limit(10);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: urgentCalls } = await supabaseAdmin
    .from('call_history')
    .select('caller_number, caller_name, sentiment, call_summary, call_date')
    .in('sentiment', ['frustrated', 'negative'])
    .gt('call_date', oneDayAgo)
    .order('call_date', { ascending: false })
    .limit(5);

  const { data: cronHealth } = await supabaseAdmin
    .from('cron_health')
    .select('*')
    .order('job_name', { ascending: true });

  return {
    date: today,
    jobs: jobList.map(j => ({ name: j.name, load_size: j.load_size, time: j.job_time, status: j.status, total: j.total_price, balance: j.balance_due, paid: j.payment_status })),
    revenue_to_collect: revenueToCollect,
    revenue_collected: revenueCollected,
    pending_offers: pendingOffers || [],
    urgent_calls: urgentCalls || [],
    cron_health: cronHealth || [],
  };
}

async function toolGetSchedule({ day_type, date }) {
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
  const { data } = await q.limit(20);
  const open = (data || []).filter((s) => s.jobs_booked < s.max_jobs);
  return {
    open_slots: open.map(s => ({ date: s.slot_date, time: s.slot_time, day_type: s.day_type, spots_left: s.max_jobs - s.jobs_booked })),
    total_open: open.length,
  };
}

async function toolEscalateToOperator({ message, priority }) {
  try {
    const msg = `[${(priority || 'medium').toUpperCase()}] AI Agent escalation: ${message}`;
    await sendSMS(OPERATOR_PHONE, msg, null, 'ai_escalation');
    await logAction('escalate_to_operator', { message, priority }, true);
    return { success: true, message: `Operator notified via SMS with ${priority || 'medium'} priority` };
  } catch (e) {
    await logAction('escalate_to_operator', { message, priority }, false, e.message);
    return { error: e.message };
  }
}

async function toolGetBookingTimeline({ booking_ref }) {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, name, status, total_price, balance_due, job_date, job_time')
      .eq('booking_ref', (booking_ref || '').toUpperCase())
      .maybeSingle();
    if (!booking) return { error: 'Booking not found' };

    const { data: events } = await supabaseAdmin
      .from('system_events')
      .select('event_type, payload, created_at')
      .or(`payload->>booking_ref.eq.${booking_ref.toUpperCase()},metadata->>booking_id.eq.${booking.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: messages } = await supabaseAdmin
      .from('sms_messages')
      .select('body, direction, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      booking: { ref: booking.booking_ref, name: booking.name, status: booking.status, total: booking.total_price, balance: booking.balance_due, date: booking.job_date, time: booking.job_time },
      events: (events || []).map(e => ({ type: e.event_type, time: e.created_at, payload: e.payload })),
      messages: (messages || []).map(m => ({ direction: m.direction, body: m.body, time: m.created_at })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
// ACTION LOGGING
// ============================================================
async function logAction(tool, args, success, error = null) {
  try {
    // Try ai_agent_actions table first
    const { error: tblErr } = await supabaseAdmin.from('ai_agent_actions').insert({
      tool_name: tool,
      arguments: args,
      success,
      error,
      created_at: new Date().toISOString(),
    });
    // If table doesn't exist, fall back to system_events
    if (tblErr) {
      await logEvent('ai_agent_action', { tool, args, success, error });
    }
  } catch (e) {
    console.error('Failed to log AI agent action:', e);
  }
}

// ============================================================
// MAIN AGENT FUNCTION — process a user message and respond
// ============================================================
export const runAgent = async (userMessage, conversationHistory = []) => {
  if (await isKillSwitchOn('ai_agent')) {
    return { error: 'AI agent is disabled (kill switch is on)' };
  }

  // Gather live context
  const context = await gatherOperationalContext();

  const systemPrompt = `You are the AI operations agent for Junk Haul Calgary, a junk removal company in Calgary, Alberta. You run Thursdays and Sundays.

You are NOT just a narrator — you are a functional agent that can TAKE ACTIONS. You have tools available to send SMS, trigger calls, look up bookings, cancel/reschedule, update config, and more.

## Your capabilities
- Send SMS to any phone number
- Trigger AI voice calls to customers (Casey=sales, Jordan=service, Riley=refunds)
- Look up bookings by ref or phone
- Cancel or reschedule bookings
- Update system config (kill switches, pricing, surge)
- Add customers to waitlist
- Send emails
- Get today's operational summary
- Check available schedule slots
- Escalate urgent issues to the operator (Hammad)
- Get booking timelines

## Current operational context
${context}

## Rules
- Always confirm destructive actions (cancelling bookings, changing pricing) before executing. Ask "Are you sure?" first.
- When a customer is frustrated, offer to call them with the appropriate agent.
- When sending SMS, keep messages short and friendly.
- When triggering calls, provide clear context about why we're calling.
- For config changes, always explain what the change does and why.
- If you're not sure about something, say so and suggest escalating to the operator.
- Be concise in your responses. The admin is busy.
- Use the tools when asked — don't just say "you should do X", actually DO it.
- Today is ${edmontonNowParts().date}. We operate Thursdays and Sundays only.`;

  // Build messages array with conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // First call — DeepSeek may return tool_calls or a text response
  const firstResponse = await callDeepSeek({
    messages,
    tools: AGENT_TOOLS,
    model: 'deepseek-chat',
    temperature: 0.3,
    max_tokens: 800,
  });

  // If no tool calls, just return the text
  if (!firstResponse.tool_calls || firstResponse.tool_calls.length === 0) {
    return {
      response: firstResponse.content,
      actions: [],
      usage: firstResponse.usage,
    };
  }

  // Execute tool calls
  const actions = [];
  const toolResults = [];

  for (const call of firstResponse.tool_calls) {
    const toolName = call.function.name;
    let args = {};
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      args = {};
    }

    const result = await executeTool(toolName, args);
    actions.push({ tool: toolName, args, result });
    toolResults.push({
      tool_call_id: call.id,
      role: 'tool',
      content: JSON.stringify(result),
    });
  }

  // Second call — send tool results back to DeepSeek for a final response
  const secondMessages = [
    ...messages,
    {
      role: 'assistant',
      content: firstResponse.content || '',
      tool_calls: firstResponse.tool_calls,
    },
    ...toolResults,
  ];

  const secondResponse = await callDeepSeek({
    messages: secondMessages,
    tools: AGENT_TOOLS,
    model: 'deepseek-chat',
    temperature: 0.3,
    max_tokens: 600,
  });

  return {
    response: secondResponse.content || firstResponse.content || 'Done.',
    actions,
    usage: {
      first: firstResponse.usage,
      second: secondResponse.usage,
    },
  };
};

// ============================================================
// Gather operational context for the system prompt
// ============================================================
async function gatherOperationalContext() {
  const { date: today } = edmontonNowParts();
  const parts = [];

  parts.push(`Date: ${today}`);

  try {
    const { data: jobs } = await supabaseAdmin
      .from('bookings')
      .select('name, load_size, job_time, status, total_price, balance_due, payment_status')
      .eq('job_date', today)
      .in('status', ['confirmed', 'completed', 'rescheduled']);

    const jobList = jobs || [];
    const toCollect = jobList.reduce((s, b) => s + (b.balance_due || 0), 0);
    const collected = jobList.filter(b => b.status === 'completed' && b.payment_status === 'paid').reduce((s, b) => s + b.total_price, 0);

    parts.push(`Jobs today: ${jobList.length}, to collect: $${toCollect}, collected: $${collected}`);
    if (jobList.length > 0) {
      parts.push(`Job list: ${jobList.map(j => `${j.name} (${j.load_size}, ${j.job_time}, $${j.total_price}, ${j.status})`).join('; ')}`);
    }
  } catch (_) {}

  try {
    const now = new Date().toISOString();
    const { data: offers } = await supabaseAdmin
      .from('nearby_offers')
      .select('customer_phone, discount_percent, offer_expires_at')
      .gt('offer_expires_at', now)
      .limit(5);
    if (offers && offers.length > 0) {
      parts.push(`Pending offers: ${offers.length}`);
    }
  } catch (_) {}

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: calls } = await supabaseAdmin
      .from('call_history')
      .select('caller_number, sentiment, call_summary')
      .in('sentiment', ['frustrated', 'negative'])
      .gt('call_date', oneDayAgo)
      .limit(3);
    if (calls && calls.length > 0) {
      parts.push(`Urgent calls: ${calls.length} frustrated/negative in 24h`);
      for (const c of calls) {
        parts.push(`  - ${c.caller_number}: ${c.sentiment} — ${(c.call_summary || '').slice(0, 80)}`);
      }
    }
  } catch (_) {}

  try {
    const { data: cronJobs } = await supabaseAdmin
      .from('cron_health')
      .select('job_name, last_status, last_run_at')
      .order('job_name', { ascending: true });
    if (cronJobs && cronJobs.length > 0) {
      const stale = cronJobs.filter(j => {
        if (!j.last_run_at) return true;
        const age = Date.now() - new Date(j.last_run_at).getTime();
        return age > 2 * 60 * 60 * 1000; // >2h stale
      });
      if (stale.length > 0) {
        parts.push(`Stale cron jobs: ${stale.map(j => j.job_name).join(', ')}`);
      }
    }
  } catch (_) {}

  return parts.join('\n');
};
