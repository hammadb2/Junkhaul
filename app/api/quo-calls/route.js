import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Receives Quo call webhooks (call.ringing, call.completed).
// Logs calls to the phone_calls table for the admin dashboard.
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const type = payload?.type;
  const data = payload?.data?.object || payload?.data || {};

  if (type === 'call.ringing') {
    // Incoming call ringing — could log or trigger realtime updates
    console.log('Quo call ringing from:', data.from || data.callerNumber);
  }

  if (type === 'call.completed') {
    try {
      await supabaseAdmin.from('phone_calls').insert({
        vapi_call_id: data.id || data.callId || null,
        caller_number: data.from || data.callerNumber || null,
        direction: data.direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: data.duration ? Math.round(data.duration) : null,
        cost_usd: data.cost || null,
        outcome: data.status || data.outcome || null,
        agent_type: 'booking',
      });
    } catch (e) {
      console.error('quo call log failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
