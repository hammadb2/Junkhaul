import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { cancelBooking } from '@/lib/cancellations';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { booking_id, reason, by = 'operator' } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  try {
    const result = await cancelBooking(booking_id, reason || 'Cancelled by operator', by);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
