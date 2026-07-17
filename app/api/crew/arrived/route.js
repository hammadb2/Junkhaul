import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/crew/arrived — crew marks arrived at job site.
// Updates crew_status, sends customer SMS.
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    isLegacyPinAuth: true,
    actionType: 'arrival',
    employeeId: undefined,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', booking_id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      crew_status: 'arrived',
      crew_arrived_at: new Date().toISOString(),
    })
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send "crew has arrived" SMS
  try {
    await sendSMS(
      booking.phone,
      `Your Junk Haul Calgary crew has arrived! 🎉`,
      booking_id,
      'arrived'
    );
  } catch {
    // silent
  }

  return NextResponse.json({ ok: true });
}
