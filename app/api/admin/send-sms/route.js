import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === adminToken;
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { booking_id, phone, message } = await req.json();
  if (!phone || !message) return NextResponse.json({ error: 'phone and message required' }, { status: 400 });

  try {
    await sendSMS(phone, message, booking_id || null, 'operator_manual');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
