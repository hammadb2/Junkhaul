import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/crew/resend-payment-link — sends the customer an SMS with a link
// to the /pay/[booking_id] page where they can pay on their own device.
//
// Auth: employee session cookie (jh_employee_session) only. The legacy
// x-crew-pin fallback was removed — the PIN-based crew app has no
// recorded usage (see docs/RELIABILITY_MASTER_PLAN.md).
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, route_id, route_version } = body;
  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
  }

  const routeCheck = await checkRouteVersion(booking_id, route_id, route_version, {
    isLegacyPinAuth: false,
    actionType: 'payment',
    employeeId: employee.id,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  // Verify the employee is assigned to this booking's crew.
  if (!await isEmployeeAssignedToBooking(employee.id, booking_id)) {
    return NextResponse.json({ error: 'Not assigned to this booking' }, { status: 403 });
  }

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const payUrl = `https://junkhaul.ca/pay/${booking_id}`;
  const smsBody = `Hi ${booking.name}, here's your payment link for your Junk Haul Calgary pickup today. Balance due: $${booking.balance_due}. Pay here: ${payUrl}`;

  try {
    await sendSMS(booking.phone, smsBody, booking_id, 'payment_link');
  } catch (err) {
    return NextResponse.json({ error: 'SMS failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
