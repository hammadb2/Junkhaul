import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// Vapi Outbound Bridge via Quo
// 
// Vapi has US numbers and can't call/text Canadian customers directly.
// This endpoint:
// 1. Creates a Vapi outbound call (Vapi calls our Quo number)
// 2. Quo bridges the call to the customer's Canadian number
// 3. Vapi assistant talks to the customer through the Quo bridge
//
// For SMS: Vapi puts the message in the backend (via send_email or
// notify_operator tools), and Quo sends the actual SMS to the customer.
// ============================================================

export async function POST(req) {
  try {
    const { phone, agent_type, context, message } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const VAPI_KEY = process.env.VAPI_API_KEY;

    // Determine which assistant to use
    let assistantId;
    if (agent_type === 'refunds') {
      assistantId = '204b8b2f-325b-4d2b-95da-613ed0c51c68'; // Riley
    } else if (agent_type === 'service') {
      assistantId = '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b'; // Jordan
    } else {
      assistantId = '8a7d8d53-3749-4814-bd36-39239e8a9c86'; // Casey (Sales)
    }

    // Create a Vapi outbound call
    // Vapi will call the customer's number directly
    // (Vapi can make outbound calls to Canadian numbers even from US numbers)
    const callRes = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        customer: {
          number: phone,
        },
        assistantOverrides: {
          context: context || '',
        },
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      }),
    });

    const callData = await callRes.json();

    if (!callRes.ok) {
      console.error('Vapi outbound call failed:', callData);
      return NextResponse.json({ error: 'Failed to create call', details: callData }, { status: 500 });
    }

    // Log the outbound call
    try {
      await supabaseAdmin.from('phone_calls').insert({
        vapi_call_id: callData.id,
        caller_number: phone,
        direction: 'outbound',
        outcome: 'vapi_outbound_followup',
        transcript: context || null,
        agent_type: agent_type || 'sales',
      });
    } catch (e) {
      console.error('Call log failed:', e);
    }

    return NextResponse.json({ ok: true, call_id: callData.id });
  } catch (e) {
    console.error('Vapi outbound error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
