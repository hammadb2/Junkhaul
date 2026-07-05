import { NextResponse } from 'next/server';
import { rescheduleBooking } from '@/lib/reschedule';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, new_date, new_time } = await req.json();
  if (!booking_id || !new_date || !new_time) {
    return NextResponse.json({ error: 'booking_id, new_date, new_time required' }, { status: 400 });
  }
  try {
    const result = await rescheduleBooking(booking_id, new_date, new_time);
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
