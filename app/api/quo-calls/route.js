import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { QUO_SIGNATURE_HEADER, verifyQuoWebhookSignature } from '@/lib/quoWebhookAuth';
import { recordCallHistory } from '@/lib/callHistory';

export const runtime = 'nodejs';

// Receives Quo call webhooks (call.ringing, call.completed).
// Logs calls to the phone_calls table for the admin dashboard.
export async function POST(req) {
  const rawBody = await req.text();

  const signingSecret = process.env.QUO_WEBHOOK_SIGNING_SECRET || process.env.QUO_WEBHOOK_SECRET;
  const signatureHeader = req.headers.get(QUO_SIGNATURE_HEADER);
  const requireSignature = process.env.QUO_WEBHOOK_SIGNATURE_REQUIRED !== 'false';
  const verification = verifyQuoWebhookSignature({ rawBody, signatureHeader, signingSecret });
  if (requireSignature && !verification.ok) {
    console.warn('quo-calls webhook rejected:', { reason: verification.reason });
    return NextResponse.json({ error: 'Unauthorized', reason: verification.reason }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
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
    const callerNumber = data.from || data.callerNumber || null;
    const durationSeconds = data.duration ? Math.round(data.duration) : null;
    const callOutcome = data.status || data.outcome || null;
    try {
      await supabaseAdmin.from('phone_calls').insert({
        vapi_call_id: data.id || data.callId || null,
        caller_number: callerNumber,
        direction: data.direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: durationSeconds,
        cost_usd: data.cost || null,
        outcome: callOutcome,
        agent_type: 'booking',
      });
    } catch (e) {
      console.error('quo call log failed:', e);
    }
    await recordCallHistory({
      callerNumber,
      vapiCallId: data.id || data.callId || null,
      agentType: 'booking',
      durationSeconds,
      callOutcome,
    });
  }

  return NextResponse.json({ ok: true });
}
