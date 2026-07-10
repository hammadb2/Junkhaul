import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/signature — capture customer signature after job completion
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    booking_id, customer_name_typed, customer_signature_url,
    amount_confirmed, payment_method, // 'cash' or 'card'
  } = body;

  if (!booking_id || !customer_name_typed || !amount_confirmed) {
    return NextResponse.json({ error: 'booking_id, customer_name_typed, and amount_confirmed are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('customer_signatures')
    .insert({
      booking_id,
      customer_name_typed,
      customer_signature_url: customer_signature_url || null,
      crew_member_typed: emp.name,
      crew_member_id: emp.id,
      amount_confirmed,
      payment_method: payment_method || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update booking payment status
  await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_method: payment_method || null,
      status: 'completed',
    })
    .eq('id', booking_id);

  return NextResponse.json({ ok: true, signature: data });
}

// GET — retrieve signatures for a booking
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('customer_signatures')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signatures: data || [] });
}
