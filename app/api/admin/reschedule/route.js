import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { rescheduleBooking } from '@/lib/reschedule';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
