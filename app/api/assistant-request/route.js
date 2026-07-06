import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 10;

// ============================================================
// Vapi Assistant Request Webhook
//
// TWO MODES depending on which number was called:
//
// 1. GREETER NUMBER (+14127149826):
//    - Quo forwards the call here
//    - We look up the customer, determine the right department
//    - Return the greeter assistant + transfer_destination variable
//    - Greeter says "Hey, thanks for calling Junk Haul Calgary!"
//    - Greeter calls transferToAgent → hold music plays → transfers
//
// 2. DEPARTMENT NUMBERS (sales/service/refund):
//    - Called by the greeter transfer
//    - We look up the customer again (caller ID passes through)
//    - Return the department agent + customer context variables
//    - Agent picks up with "Hey [first name], hows it going?"
//
// If the caller ID does NOT pass through on transfer, the department
// agent will still work but greet generically ("Hey there").
// ============================================================

// Phone number IDs
const GREETER_NUMBER = '+14127149826';
const GREETER_ASSISTANT_ID = '6a8e3193-85fe-400a-b6d2-32f024803b7e';
const SQUAD_ID = '7ee74770-c96b-4254-995a-0d1270b419bc';

// Department Vapi numbers (the greeter transfers to these)
const DEPT_SALES = '+14127149201';      // Casey
const DEPT_SERVICE = '+14127149625';    // Jordan
const DEPT_REFUNDS = '+14127149181';    // Riley

// Department assistant IDs
const ASSISTANT_CASEY = '8a7d8d53-3749-4814-bd36-39239e8a9c86';
const ASSISTANT_JORDAN = '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
const ASSISTANT_RILEY = '204b8b2f-325b-4d2b-95da-613ed0c51c68';
const ASSISTANT_MORGAN = '88891da2-0cff-4486-8110-8195fd676c1c';
const MANAGER_NUMBER = '+14127149656';

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message || {};

    if (message.type !== 'assistant-request') {
      return NextResponse.json({ error: 'Not an assistant request' }, { status: 400 });
    }

    // Get the caller's REAL phone number
    const callerNumber = message.call?.from?.phoneNumber ||
                         message.call?.customer?.number ||
                         body?.call?.from?.phoneNumber ||
                         body?.call?.customer?.number ||
                         '';

    // Get the number that was called (to determine greeter vs department)
    const calledNumber = message.call?.to?.phoneNumber ||
                         message.phoneNumber?.number ||
                         body?.call?.to?.phoneNumber ||
                         '';

    console.log('Assistant request - caller:', callerNumber, 'called:', calledNumber);

    // Look up the customer in our database
    const customerInfo = await lookupCustomer(callerNumber);

    // Determine which department to route to
    const routing = determineRouting(customerInfo);

    // Build customer context variables
    const variableValues = buildVariables(customerInfo, callerNumber);

    // MODE 1: Greeter number — return the right agent directly
    // No greeter, no squad. The agent picks up immediately with a personalized greeting.
    // Hold music is handled on the Quo side before the call connects to Vapi.
    if (calledNumber === GREETER_NUMBER || !calledNumber) {
      const variableValues = buildVariables(customerInfo, callerNumber);
      variableValues.caller_context = customerInfo.contextSummary;

      // Check if customer's last call was an escalation to manager
      const lastCall = customerInfo.callHistory?.[0];
      if (lastCall && lastCall.call_outcome === 'complaint_logged' && lastCall.sentiment === 'angry') {
        // Auto-route to Morgan if last call was an angry complaint
        return NextResponse.json({
          assistantId: ASSISTANT_MORGAN,
          assistantOverrides: { variableValues },
        });
      }

      return NextResponse.json({
        assistantId: routing.assistantId,
        assistantOverrides: {
          variableValues,
        },
      });
    }

    // MODE 1b: Manager number — route to Morgan directly
    if (calledNumber === MANAGER_NUMBER) {
      const variableValues = buildVariables(customerInfo, callerNumber);
      variableValues.caller_context = customerInfo.contextSummary;
      return NextResponse.json({
        assistantId: ASSISTANT_MORGAN,
        assistantOverrides: { variableValues },
      });
    }

    // MODE 2: Department number — return the actual agent + customer context
    variableValues.caller_context = customerInfo.contextSummary;

    return NextResponse.json({
      assistantId: routing.assistantId,
      assistantOverrides: {
        variableValues,
      },
    });
  } catch (e) {
    console.error('Assistant request error:', e);
    // Fallback to greeter
    return NextResponse.json({
      assistantId: GREETER_ASSISTANT_ID,
      assistantOverrides: {
        variableValues: {
          transfer_destination: DEPT_SALES,
          customer_first_name: 'there',
        },
      },
    });
  }
}

// ============================================================
// Customer lookup
// ============================================================
async function lookupCustomer(callerNumber) {
  let customer = null;
  let bookings = [];

  if (!callerNumber) {
    return {
      customer: null,
      bookings: [],
      contextSummary: 'INCOMING CALLER INFO: Unknown caller, no phone number available.',
    };
  }

  const normalizedPhone = callerNumber.replace(/^\+1/, '').replace(/\D/g, '');
  const phonePatterns = [
    callerNumber,
    `+1${normalizedPhone}`,
    `1${normalizedPhone}`,
    normalizedPhone,
  ];

  // Search bookings by phone number
  const { data: bookingResults } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(5);

  if (bookingResults && bookingResults.length > 0) {
    bookings = bookingResults;
    const recent = bookingResults[0];
    customer = {
      name: recent.name,
      first_name: recent.name?.split(' ')[0] || 'there',
      phone: recent.phone,
      email: recent.email,
      booking_ref: recent.booking_ref,
      booking_status: recent.status,
      load_size: recent.load_size,
      job_date: recent.job_date,
      job_time: recent.job_time,
      address: recent.address,
      total_price: recent.total_price,
      balance_due: recent.balance_due,
    };
  }

  // Check refund_requests
  const { data: refundRequests } = await supabaseAdmin
    .from('refund_requests')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  if (refundRequests && refundRequests.length > 0) {
    customer = customer || {
      name: refundRequests[0].name,
      first_name: refundRequests[0].name?.split(' ')[0] || 'there',
      phone: refundRequests[0].phone,
    };
    customer.has_refund_request = true;
    customer.refund_reason = refundRequests[0].reason;
  }

  // Check service_requests
  const { data: serviceRequests } = await supabaseAdmin
    .from('service_requests')
    .select('*')
    .or(phonePatterns.map(p => `phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  if (serviceRequests && serviceRequests.length > 0) {
    customer = customer || {
      name: serviceRequests[0].name,
      first_name: serviceRequests[0].name?.split(' ')[0] || 'there',
      phone: serviceRequests[0].phone,
    };
    customer.has_service_request = true;
    customer.service_request_type = serviceRequests[0].request_type;
  }

  // Get last 3 calls from this customer
  const { data: callHistory } = await supabaseAdmin
    .from('call_history')
    .select('*')
    .or(phonePatterns.map(p => `caller_number.eq.${p}`).join(','))
    .order('call_date', { ascending: false })
    .limit(3);

  // Build context summary
  let contextSummary = '';
  if (customer) {
    contextSummary = `INCOMING CALLER INFO: Name: ${customer.name}. Phone: ${callerNumber}. `;
    if (customer.booking_ref) {
      contextSummary += `Booking ref: ${customer.booking_ref}. Status: ${customer.booking_status}. Load: ${customer.load_size}. Date: ${customer.job_date} at ${customer.job_time}. Address: ${customer.address}. Total: $${customer.total_price}. Balance due: $${customer.balance_due}. `;
    }
    if (customer.has_refund_request) {
      contextSummary += `Has a pending refund request: ${customer.refund_reason}. `;
    }
    if (customer.has_service_request) {
      contextSummary += `Has a pending service request: ${customer.service_request_type}. `;
    }
    if (bookings.length > 1) {
      contextSummary += `Returning customer with ${bookings.length} bookings. `;
    }
  } else {
    contextSummary = `INCOMING CALLER INFO: New caller, phone ${callerNumber}. No previous bookings found. This is a potential new customer.`;
  }

  // Add call history so the agent knows what the customer called about before
  if (callHistory && callHistory.length > 0) {
    contextSummary += '\nPREVIOUS CALLS:\n';
    for (const call of callHistory) {
      const dateStr = new Date(call.call_date).toLocaleString('en-CA', {
        timeZone: 'America/Edmonton',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const summary = call.call_summary || 'No summary available';
      const outcome = call.call_outcome || 'unknown';
      const sentiment = call.sentiment || 'neutral';
      contextSummary += `- ${dateStr}: ${summary} Outcome: ${outcome}. Sentiment: ${sentiment}.\n`;
    }
  }

  return { customer, bookings, contextSummary };
}

// ============================================================
// Routing logic — which department + which agent
// ============================================================
function determineRouting(customerInfo) {
  const { customer } = customerInfo;

  if (customer?.has_refund_request) {
    return { assistantId: ASSISTANT_RILEY, destination: DEPT_REFUNDS, department: 'refunds' };
  }
  if (customer?.has_service_request) {
    return { assistantId: ASSISTANT_JORDAN, destination: DEPT_SERVICE, department: 'service' };
  }
  if (customer?.booking_status === 'pending_payment' || customer?.booking_status === 'confirmed') {
    return { assistantId: ASSISTANT_JORDAN, destination: DEPT_SERVICE, department: 'service' };
  }
  // New caller or anything else → sales
  return { assistantId: ASSISTANT_CASEY, destination: DEPT_SALES, department: 'sales' };
}

// ============================================================
// Build dynamic variables for the assistant
// ============================================================
function buildVariables(customerInfo, callerNumber) {
  const { customer, bookings } = customerInfo;
  return {
    customer_first_name: customer?.first_name || 'there',
    customer_name: customer?.name || '',
    customer_phone: callerNumber,
    has_booking: customer ? 'true' : 'false',
    booking_ref: customer?.booking_ref || '',
    booking_status: customer?.booking_status || '',
    booking_load_size: customer?.load_size || '',
    booking_date: customer?.job_date || '',
    booking_time: customer?.job_time || '',
    booking_address: customer?.address || '',
    booking_total: customer?.total_price ? String(customer.total_price) : '',
    booking_balance: customer?.balance_due ? String(customer.balance_due) : '',
    has_refund_request: customer?.has_refund_request ? 'true' : 'false',
    has_service_request: customer?.has_service_request ? 'true' : 'false',
    service_request_type: customer?.service_request_type || '',
    is_returning_customer: bookings.length > 0 ? 'true' : 'false',
    booking_count: String(bookings.length),
  };
}
