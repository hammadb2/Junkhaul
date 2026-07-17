import { NextResponse } from 'next/server';
import { handleCanonicalQuoInbound } from '@/lib/quoInbound';
import { QUO_SIGNATURE_HEADER, verifyQuoWebhookSignature } from '@/lib/quoWebhookAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const rawBody = await req.text();
  const signingSecret = process.env.QUO_WEBHOOK_SIGNING_SECRET || process.env.QUO_WEBHOOK_SECRET;
  const signatureHeader = req.headers.get(QUO_SIGNATURE_HEADER);
  const requireSignature = process.env.QUO_WEBHOOK_SIGNATURE_REQUIRED !== 'false';
  const verification = verifyQuoWebhookSignature({
    rawBody,
    signatureHeader,
    signingSecret,
  });

  if (requireSignature && !verification.ok) {
    console.warn('Quo webhook rejected:', { reason: verification.reason });
    return NextResponse.json({ error: 'Unauthorized', reason: verification.reason }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await handleCanonicalQuoInbound(payload, { signatureTimestamp: verification.timestamp || null });
  return NextResponse.json(result);
}
