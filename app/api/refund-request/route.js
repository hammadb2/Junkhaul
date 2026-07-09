import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// Customer submits a refund request online.
// 1. Store in database
// 2. SMS the customer a confirmation
// 3. SMS the operator about the new request
// 4. Vapi (Riley) will follow up via phone
export async function POST(req) {
  try {
    const { name, phone, email = null, booking_ref = null, reason, amount = null } = await req.json();

    if (!name || !phone || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store the refund request
    const { data, error } = await supabaseAdmin
      .from('refund_requests')
      .insert({
        name,
        phone,
        email,
        booking_ref: booking_ref?.toUpperCase() || null,
        reason,
        amount_requested: amount ? parseFloat(amount) : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Table might not exist — create a fallback by storing in phone_calls
      console.error('Refund request insert failed:', error);
      // Try storing as a phone_call record
      await supabaseAdmin.from('phone_calls').insert({
        caller_number: phone,
        direction: 'inbound',
        outcome: 'refund_request_online',
        transcript: `Refund request from ${name}: ${reason}${booking_ref ? ` (Ref: ${booking_ref})` : ''}${amount ? ` Amount: $${amount}` : ''}`,
        agent_type: 'refunds',
      });
    }

    // SMS the customer a confirmation
    const customerMsg = `Hi ${name}, we've received your refund request${booking_ref ? ` for booking ${booking_ref.toUpperCase()}` : ''}. Our Resolution team will review it within 24 hours and call you with the outcome. Thanks for your patience. — Junk Haul Calgary`;
    try {
      await sendSMS(phone, customerMsg, null, 'refund_request_confirmation');
    } catch (e) {
      console.error('Customer SMS failed:', e);
    }

    // SMS the operator
    const operatorMsg = `NEW REFUND REQUEST from ${name} (${phone})${booking_ref ? ` Ref: ${booking_ref.toUpperCase()}` : ''}${amount ? ` Amount: $${amount}` : ''}. Reason: ${reason.slice(0, 100)}. Review and follow up ASAP.`;
    try {
      await sendSMS(process.env.HAMMAD_PHONE, operatorMsg, null, 'refund_request_operator');
    } catch (e) {
      console.error('Operator SMS failed:', e);
    }

    // Trigger Vapi follow-up call (via Quo bridge)
    try {
      await fetch('https://junkhaul.ca/api/vapi-outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vapi-secret': process.env.VAPI_SERVER_SECRET || '',
        },
        body: JSON.stringify({
          phone,
          agent_type: 'refunds',
          context: `Refund request from ${name}. Reason: ${reason}. Booking ref: ${booking_ref || 'none'}.`,
        }),
      });
    } catch (e) {
      console.error('Vapi follow-up trigger failed:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Refund request error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
