import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// Customer submits a service request online (reschedule, cancel, question, complaint).
// 1. Store in database
// 2. SMS the customer a confirmation
// 3. SMS the operator about the new request
// 4. Vapi (Jordan) will follow up via phone
export async function POST(req) {
  try {
    const { name, phone, email = null, booking_ref = null, request_type, details } = await req.json();

    if (!name || !phone || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store the service request
    const { error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        name,
        phone,
        email,
        booking_ref: booking_ref?.toUpperCase() || null,
        request_type,
        details,
        status: 'pending',
      });

    if (error) {
      console.error('Service request insert failed:', error);
      // Fallback: store in phone_calls
      await supabaseAdmin.from('phone_calls').insert({
        caller_number: phone,
        direction: 'inbound',
        outcome: `service_request_${request_type}`,
        transcript: `Service request from ${name}: ${details}${booking_ref ? ` (Ref: ${booking_ref})` : ''}`,
        agent_type: 'service',
      });
    }

    // SMS the customer a confirmation
    const typeLabel = {
      reschedule: 'reschedule request',
      cancel: 'cancellation request',
      address_change: 'address change request',
      question: 'question',
      complaint: 'complaint',
      other: 'request',
    }[request_type] || 'request';

    const customerMsg = `Hi ${name}, we've received your ${typeLabel}${booking_ref ? ` for booking ${booking_ref.toUpperCase()}` : ''}. Our Customer Service team will follow up shortly. Thanks for reaching out. — Junk Haul Calgary`;
    try {
      await sendSMS(phone, customerMsg, null, 'service_request_confirmation');
    } catch (e) {
      console.error('Customer SMS failed:', e);
    }

    // SMS the operator
    const operatorMsg = `NEW ${request_type.toUpperCase()} REQUEST from ${name} (${phone})${booking_ref ? ` Ref: ${booking_ref.toUpperCase()}` : ''}. Details: ${details.slice(0, 100)}. Follow up ASAP.`;
    try {
      await sendSMS(process.env.HAMMAD_PHONE, operatorMsg, null, 'service_request_operator');
    } catch (e) {
      console.error('Operator SMS failed:', e);
    }

    // Trigger Vapi follow-up call (via Quo bridge)
    try {
      await fetch('https://junkhaul.ca/api/vapi-outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          agent_type: 'service',
          context: `Service request from ${name}. Type: ${request_type}. Details: ${details}. Booking ref: ${booking_ref || 'none'}.`,
        }),
      });
    } catch (e) {
      console.error('Vapi follow-up trigger failed:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Service request error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
