import { NextResponse } from 'next/server';
import { handleCanonicalQuoInbound } from '@/lib/quoInbound';

export const runtime = 'nodejs';

export async function POST(req) {
  const payload = await req.json();
  const result = await handleCanonicalQuoInbound(payload);
  return NextResponse.json(result);
}
