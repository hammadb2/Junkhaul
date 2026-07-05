import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req) {
  const { booking_id, operator_notes } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ operator_notes, updated_at: new Date().toISOString() })
    .eq('id', booking_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
