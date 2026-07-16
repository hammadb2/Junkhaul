import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// Allowed region types and event types. Kept in sync with the Flutter
// GeofenceService constants (kGeofenceType* / GeofenceEventType).
const REGION_TYPES = new Set(['customer', 'landfill', 'storage', 'truck']);
const EVENT_TYPES = new Set(['arrived', 'departed']);

// POST /api/employee/geofence-event
//
// Records a geofence transition reported by the crew app and, for customer
// regions, advances the booking's crew_status so dispatch + customer tracking
// reflect the crew's progress without a manual button press.
//
// Body: { region_id, event_type, lat, lng, accuracy?, timestamp?, region_type?, booking_id? }
// Auth: employee session cookie.
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    region_id,
    event_type,
    lat,
    lng,
    accuracy,
    timestamp,
    region_type,
    booking_id,
  } = body;

  // --- validate -----------------------------------------------------------
  if (typeof region_id !== 'string' || region_id.length === 0) {
    return NextResponse.json({ error: 'region_id is required' }, { status: 400 });
  }
  if (typeof event_type !== 'string' || !EVENT_TYPES.has(event_type)) {
    return NextResponse.json(
      { error: "event_type must be 'arrived' or 'departed'" },
      { status: 400 },
    );
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required (numbers)' }, { status: 400 });
  }
  if (region_type != null && !REGION_TYPES.has(region_type)) {
    return NextResponse.json(
      { error: 'region_type must be one of customer, landfill, storage, truck' },
      { status: 400 },
    );
  }

  // Normalize: for customer regions the region_id IS the booking id unless
  // an explicit booking_id is supplied.
  const effectiveRegionType = region_type || 'customer';
  const effectiveBookingId = booking_id || (effectiveRegionType === 'customer' ? region_id : null);
  const eventTimestamp = timestamp || new Date().toISOString();

  // --- persist the event --------------------------------------------------
  const { data: eventRow, error: insertError } = await supabaseAdmin
    .from('geofence_events')
    .insert({
      employee_id: emp.id,
      booking_id: effectiveBookingId,
      event_type,
      lat,
      lng,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      timestamp: eventTimestamp,
      region_id,
      region_type: effectiveRegionType,
    })
    .select('id')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // --- side effects for customer regions ---------------------------------
  let bookingUpdated = false;

  if (effectiveRegionType === 'customer' && effectiveBookingId) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, crew_status')
      .eq('id', effectiveBookingId)
      .maybeSingle();

    if (booking) {
      if (event_type === 'arrived') {
        // Only advance into 'arrived' if the crew hasn't already progressed
        // past it (in_progress / awaiting_payment / complete). This prevents
        // a stale geofence ping from rewinding the lifecycle.
        const canArrive =
          booking.crew_status === 'confirmed' ||
          booking.crew_status === 'en_route' ||
          booking.crew_status === 'arrived';

        if (canArrive) {
          const { error: updError } = await supabaseAdmin
            .from('bookings')
            .update({
              crew_status: 'arrived',
              crew_arrived_at: eventTimestamp,
            })
            .eq('id', effectiveBookingId)
            .in('crew_status', ['confirmed', 'en_route', 'arrived']);

          if (!updError) bookingUpdated = true;
        }

        // Record a crew location point at the arrival so customer tracking +
        // history reflect the on-site position.
        await supabaseAdmin
          .from('crew_locations')
          .upsert({
            employee_id: emp.id,
            lat,
            lng,
            accuracy: typeof accuracy === 'number' ? accuracy : null,
            updated_at: eventTimestamp,
          }, { onConflict: 'employee_id' });
      } else if (event_type === 'departed') {
        // Only regress to 'departed' (modelled as en_route away from site)
        // if the job hasn't been completed. Once a booking is complete or
        // awaiting payment, a departure ping must not rewind it.
        const canDepart =
          booking.crew_status === 'arrived' ||
          booking.crew_status === 'in_progress';

        if (canDepart) {
          const { error: updError } = await supabaseAdmin
            .from('bookings')
            .update({ crew_status: 'en_route' })
            .eq('id', effectiveBookingId)
            .in('crew_status', ['arrived', 'in_progress']);

          if (!updError) bookingUpdated = true;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    event_id: eventRow?.id,
    booking_updated: bookingUpdated,
  });
}
