import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id } = await req.json();
  const auth = await requireStaffPermission(req, { permission: 'bookings.complete', entityType: 'booking', entityId: booking_id || null, action: 'booking.no_show' });
  if (!auth.ok) return auth.response;
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'no_show', updated_at: new Date().toISOString() })
    .eq('id', booking_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
