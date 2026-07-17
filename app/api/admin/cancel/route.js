import { NextResponse } from 'next/server';
import { cancelBooking } from '@/lib/cancellations';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, reason, by = 'operator' } = await req.json();
  const auth = await requireStaffPermission(req, {
    permission: 'refunds.issue',
    ownerOnly: true,
    entityType: 'booking',
    entityId: booking_id || null,
    action: 'legacy_cancel_with_refund',
    reason,
  });
  if (!auth.ok) return auth.response;
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  try {
    const result = await cancelBooking(booking_id, reason || 'Cancelled by operator', by);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
