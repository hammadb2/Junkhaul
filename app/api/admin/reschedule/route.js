import { NextResponse } from 'next/server';
import { rescheduleBooking } from '@/lib/reschedule';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, new_date, new_time } = await req.json();
  const auth = await requireStaffPermission(req, { permission: 'bookings.reschedule', entityType: 'booking', entityId: booking_id || null, action: 'booking.reschedule' });
  if (!auth.ok) return auth.response;
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
