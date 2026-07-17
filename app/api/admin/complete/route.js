import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// Mark a job complete. The review-requests cron will text the customer ~1h later.
export async function POST(req) {
  const { booking_id, operator_notes } = await req.json();
  const auth = await requireStaffPermission(req, { permission: 'bookings.complete', entityType: 'booking', entityId: booking_id || null, action: 'booking.complete' });
  if (!auth.ok) return auth.response;
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'completed',
      operator_notes: operator_notes || null,
    })
    .eq('id', booking_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
