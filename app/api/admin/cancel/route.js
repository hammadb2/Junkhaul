import { NextResponse } from 'next/server';
import { cancelBooking } from '@/lib/cancellations';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, reason, by = 'operator' } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  try {
    const result = await cancelBooking(booking_id, reason || 'Cancelled by operator', by);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
