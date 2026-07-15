import { NextResponse } from 'next/server';
import { getStringConfig } from '@/lib/config';

export const runtime = 'nodejs';

// PUBLIC endpoint — returns the booking-flow phone-gate position so the
// client can render the correct step order. No admin auth needed; this only
// exposes a single non-sensitive config value.
export async function GET() {
  const position = await getStringConfig('booking_phone_gate_position', 'phone_first');
  return NextResponse.json({ phone_gate_position: position });
}
