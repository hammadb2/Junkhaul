import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runVapiTool } from '@/lib/vapiTools';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Single webhook for all Vapi server events: tool/function calls + call logs.
// Authenticated with the shared VAPI_SERVER_SECRET header.
export async function POST(req) {
  const secret = req.headers.get('x-vapi-secret');
  if (process.env.VAPI_SERVER_SECRET && secret !== process.env.VAPI_SERVER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const message = body?.message || {};

  // ── Tool calls (current Vapi format) ──
  if (message.type === 'tool-calls' && Array.isArray(message.toolCallList)) {
    const results = [];
    for (const call of message.toolCallList) {
      const name = call.function?.name || call.name;
      let args = call.function?.arguments ?? call.arguments ?? {};
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch { args = {}; }
      }
      const result = await runVapiTool(name, args);
      results.push({ toolCallId: call.id, result });
    }
    return NextResponse.json({ results });
  }

  // ── Legacy single function-call format ──
  if (message.type === 'function-call' && message.functionCall) {
    let args = message.functionCall.parameters ?? {};
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch { args = {}; }
    }
    const result = await runVapiTool(message.functionCall.name, args);
    return NextResponse.json({ result });
  }

  // ── End-of-call report: log the call ──
  if (message.type === 'end-of-call-report') {
    try {
      await supabaseAdmin.from('phone_calls').insert({
        vapi_call_id: message.call?.id || null,
        caller_number: message.customer?.number || message.call?.customer?.number || null,
        direction: message.call?.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
        duration_seconds: message.durationSeconds ? Math.round(message.durationSeconds) : null,
        cost_usd: message.cost || null,
        transcript: message.transcript || null,
        outcome: message.endedReason || null,
        agent_type:
          message.assistant?.id === process.env.VAPI_CS_AGENT_ID ? 'customer_service' : 'booking',
      });
    } catch (e) {
      console.error('phone_calls log failed:', e);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
