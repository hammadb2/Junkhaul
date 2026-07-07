import { NextResponse } from 'next/server';
import { verifyCrewPin } from '@/lib/crewAuth';

export const runtime = 'nodejs';

// Verifies the crew PIN hash. The app hashes the 4-digit PIN with SHA-256
// locally and sends the hash. We compare with constant-time comparison.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { pin_hash } = body;
  if (!pin_hash) {
    return NextResponse.json({ error: 'Missing pin_hash' }, { status: 400 });
  }

  const ok = await verifyCrewPin(pin_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
