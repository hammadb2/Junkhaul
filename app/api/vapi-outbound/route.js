import { NextResponse } from 'next/server';
import { placeVapiOutboundCall } from '@/lib/vapiOutbound';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// Vapi Outbound Bridge via Quo — public HTTP entry point.
//
// This exists for Vapi's own tool-calling convention, which needs a
// real HTTP endpoint to hit. All in-app callers (refund-request,
// service-request, lib/aiAgent.js) call lib/vapiOutbound.js's
// placeVapiOutboundCall() directly instead, in-process (audit C6).
//
// Auth: fails closed. Previously `if (expectedSecret && secret !==
// expectedSecret)` skipped the entire check -- including the Bearer
// fallback -- whenever VAPI_SERVER_SECRET was unset, leaving this
// endpoint fully open to place real (billed) Vapi calls to any phone
// number.
// ============================================================

export async function POST(req) {
  try {
    const secret = req.headers.get('x-vapi-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.VAPI_SERVER_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ error: 'Vapi outbound is not configured' }, { status: 503 });
    }
    if (secret !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, agent_type, context } = await req.json();
    const result = await placeVapiOutboundCall({ phone, agent_type, context });

    if (!result.ok) {
      const status = result.error === 'Phone number required' ? 400
        : result.error === 'VAPI_API_KEY not configured' ? 500
        : 500;
      return NextResponse.json({ error: result.error, details: result.details }, { status });
    }

    return NextResponse.json({ ok: true, call_id: result.call_id });
  } catch (e) {
    console.error('Vapi outbound error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
