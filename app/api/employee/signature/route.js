import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';
import { bookingPaymentFields } from '@/lib/paymentStatus';

export const runtime = 'nodejs';

// POST /api/employee/signature — capture customer signature after job completion
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    booking_id, customer_name_typed, customer_signature_url,
    amount_confirmed, payment_method, // 'cash' or 'card'
    route_id, route_version,
  } = body;

  if (!booking_id || !customer_name_typed || !amount_confirmed) {
    return NextResponse.json({ error: 'booking_id, customer_name_typed, and amount_confirmed are required' }, { status: 400 });
  }

  const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
    isLegacyPinAuth: false,
    actionType: 'signature',
    employeeId: emp?.id,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
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

  // Job is physically complete regardless of payment method — that's true
  // whether the crew collected cash, will bill via a card on file, or sent
  // an SMS payment link. Only overlay payment_status/payment_method when the
  // crew's selection represents an actually-collected payment (see
  // bookingPaymentFields above); otherwise leave whatever payment state is
  // already on the booking untouched.
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      ...bookingPaymentFields(payment_method),
      status: 'completed',
    })
    .eq('id', booking_id);
  if (updateErr) {
    console.error(`Signature captured but booking update failed for ${booking_id}:`, updateErr.message);
  }

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
