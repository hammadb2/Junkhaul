import { NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, phone, message } = await req.json();
  if (!phone || !message) return NextResponse.json({ error: 'phone and message required' }, { status: 400 });

  try {
    await sendSMS(phone, message, booking_id || null, 'operator_manual');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
