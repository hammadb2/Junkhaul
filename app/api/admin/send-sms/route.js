import { NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, phone, message, reason } = await req.json();
  const auth = await requireStaffPermission(req, {
    permission: 'communications.send_approved_sms',
    entityType: booking_id ? 'booking' : 'message',
    entityId: booking_id || null,
    action: 'communications.send_manual_sms',
    reason,
  });
  if (!auth.ok) return auth.response;
  if (!phone || !message) return NextResponse.json({ error: 'phone and message required' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });

  try {
    await sendSMS(phone, message, booking_id || null, 'operator_manual');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
