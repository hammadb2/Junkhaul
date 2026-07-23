import { supabaseAdmin } from './supabase';

// ============================================================
// Vapi Outbound Bridge via Quo — shared core logic.
//
// Vapi has US numbers and can't call/text Canadian customers directly.
// This places a Vapi outbound call which Quo bridges to the customer's
// Canadian number, so the Vapi assistant talks to them through Quo.
//
// Extracted from app/api/vapi-outbound/route.js (audit C6) so internal
// callers (refund-request, service-request, lib/aiAgent.js) invoke this
// directly in-process instead of making a real outbound HTTPS round-trip
// to the app's own hardcoded production URL just to reach code running in
// the same deployment. The HTTP route still exists for Vapi's tool-calling
// convention, which needs a real endpoint.
// ============================================================
export async function placeVapiOutboundCall({ phone, agent_type, context }) {
  if (!phone) {
    return { ok: false, error: 'Phone number required' };
  }

  const VAPI_KEY = process.env.VAPI_API_KEY;
  if (!VAPI_KEY) {
    return { ok: false, error: 'VAPI_API_KEY not configured' };
  }

  // Determine which assistant to use (from env vars, fallback to known IDs)
  const SALES_ID = process.env.VAPI_BOOKING_AGENT_ID || '8a7d8d53-3749-4814-bd36-39239e8a9c86';
  const SERVICE_ID = process.env.VAPI_CS_AGENT_ID || '897317d8-f5fa-4e90-b0ef-d9d1ca3a945b';
  const REFUNDS_ID = '204b8b2f-325b-4d2b-95da-613ed0c51c68';

  let assistantId;
  if (agent_type === 'refunds') {
    assistantId = REFUNDS_ID;
  } else if (agent_type === 'service') {
    assistantId = SERVICE_ID;
  } else {
    assistantId = SALES_ID;
  }

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
    return { ok: false, error: 'Failed to create call', details: callData };
  }

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

  return { ok: true, call_id: callData.id };
}
