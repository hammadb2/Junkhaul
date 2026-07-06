import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 10;

// ============================================================
// Vapi Assistant Request Webhook
//
// When a call comes in, Vapi calls this endpoint with the caller's
// phone number. We look up the customer in our database and respond
// with:
// 1. Which assistant to route to (based on call context)
// 2. Dynamic variables (customer name, booking info, etc.)
//
// The assistant then greets the customer by name with full context.
// ============================================================

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message || {};

    // Only handle assistant-request
    if (message.type !== 'assistant-request') {
      return NextResponse.json({ error: 'Not an assistant request' }, { status: 400 });
    }

    // Get the caller's REAL phone number (not the Quo forwarding number)
    const callerNumber = message.call?.from?.phoneNumber || 
                         message.call?.customer?.number ||
                         body?.call?.from?.phoneNumber ||
                         body?.call?.customer?.number ||
                         '';

    console.log('Assistant request for caller:', callerNumber);

    // Look up the customer in our bookings database
    let customer = null;
    let bookings = [];
    let recentBooking = null;

    if (callerNumber) {
      // Normalize phone number (remove +1 prefix for matching)
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
        recentBooking = bookingResults[0];
        customer = {
          name: recentBooking.name,
          first_name: recentBooking.name?.split(' ')[0] || 'there',
          phone: recentBooking.phone,
          email: recentBooking.email,
          booking_ref: recentBooking.booking_ref,
          booking_status: recentBooking.status,
          load_size: recentBooking.load_size,
          job_date: recentBooking.job_date,
          job_time: recentBooking.job_time,
          address: recentBooking.address,
          total_price: recentBooking.total_price,
          balance_due: recentBooking.balance_due,
          has_complaint: false,
        };
      }

      // Also check refund_requests
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
    }

    // Determine which assistant to route to
    let assistantId;
    if (customer?.has_refund_request) {
      // Route to Riley (refunds)
      assistantId = '204b8b2f-325b-4d2b-95da-613ed0c51c68';
    } else if (customer?.has_service_request) {
      // Route to Jordan (service)
      assistantId = '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
    } else if (customer?.booking_status === 'pending_payment' || customer?.booking_status === 'confirmed') {
      // Existing booking — route to Jordan (service) for any changes
      assistantId = '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
    } else {
      // New caller — route to Casey (sales)
      assistantId = '8a7d8d53-3749-4814-bd36-39239e8a9c86';
    }

    // Build dynamic variables for the assistant
    const variableValues = {
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

    // Build context summary for the system prompt
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

    // Return the assistant ID with variable values and context
    return NextResponse.json({
      assistantId,
      assistantOverrides: {
        variableValues,
        context: contextSummary,
      },
    });
  } catch (e) {
    console.error('Assistant request error:', e);
    // Fallback to Casey (sales)
    return NextResponse.json({
      assistantId: '8a7d8d53-3749-4814-bd36-39239e8a9c86',
      assistantOverrides: {
        variableValues: {
          customer_first_name: 'there',
          is_returning_customer: 'false',
        },
      },
    });
  }
}
