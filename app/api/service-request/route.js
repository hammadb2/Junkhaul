import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { normalizePhone } from '@/lib/phone';
import { recordTimelineEvent } from '@/lib/timeline';
import { placeVapiOutboundCall } from '@/lib/vapiOutbound';

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
    const normalizedPhone = normalizePhone(phone);
    const { data: booking } = booking_ref
      ? await supabaseAdmin.from('bookings').select('id, booking_ref').eq('booking_ref', booking_ref.toUpperCase()).maybeSingle()
      : { data: null };

    // Store the service request
    const { data: serviceRequest, error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        name,
        phone: normalizedPhone || phone,
        normalized_phone: normalizedPhone,
        email,
        booking_ref: booking_ref?.toUpperCase() || null,
        booking_id: booking?.id || null,
        request_type,
        details,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Service request insert failed:', error);
      // Fallback: store in phone_calls
      await supabaseAdmin.from('phone_calls').insert({
        caller_number: normalizedPhone || phone,
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
      await sendSMS(normalizedPhone || phone, customerMsg, {
        booking_id: booking?.id || null,
        service_request_id: serviceRequest?.id || null,
        message_type: 'service_request_confirmation',
        workflow_action: 'service_request_confirmation',
      });
    } catch (e) {
      console.error('Customer SMS failed:', e);
    }

    // SMS the operator
    const operatorMsg = `NEW ${request_type.toUpperCase()} REQUEST from ${name} (${phone})${booking_ref ? ` Ref: ${booking_ref.toUpperCase()}` : ''}. Details: ${details.slice(0, 100)}. Follow up ASAP.`;
    try {
      await sendSMS(process.env.HAMMAD_PHONE, operatorMsg, {
        service_request_id: serviceRequest?.id || null,
        message_type: 'service_request_operator',
        workflow_action: 'operator_alert',
      });
    } catch (e) {
      console.error('Operator SMS failed:', e);
    }

    // Trigger Vapi follow-up call (via Quo bridge) -- in-process (audit C6),
    // not a self-referential HTTP call to this app's own production URL.
    try {
      await placeVapiOutboundCall({
        phone: normalizedPhone || phone,
        agent_type: 'service',
        context: `Service request from ${name}. Type: ${request_type}. Details: ${details}. Booking ref: ${booking_ref || 'none'}.`,
      });
    } catch (e) {
      console.error('Vapi follow-up trigger failed:', e);
    }

    if (serviceRequest?.id) {
      await recordTimelineEvent({
        entity_type: 'service_request',
        entity_id: serviceRequest.id,
        event_type: 'service_request_submitted',
        actor_type: 'customer',
        source: 'website',
        metadata: { booking_id: booking?.id || null, request_type },
      });
    }

    return NextResponse.json({ ok: true, service_request_id: serviceRequest?.id || null });
  } catch (e) {
    console.error('Service request error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
