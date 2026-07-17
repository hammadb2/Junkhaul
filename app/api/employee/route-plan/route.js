import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { generateRoutePlan } from '@/lib/routeOptimizer';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/employee/route-plan — returns the current canonical route plan.
// If none exists, generates one fresh.
//
// Response shape (canonical route):
// {
//   route_id: string,
//   route_version: integer,
//   route_status: string,
//   route_updated_at: string,
//   crew_assignment_id: string,
//   truck_id: string | null,
//   ordered_stops: [{ stop_id, booking_id, stop_type, sequence, status, ... }],
//   active_stop_id: string | null,
//   route_lock: boolean,
//   route_change_reason: string | null,
//   requires_acknowledgment: boolean,
//   acknowledged: boolean
// }
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find today's crew assignment for this employee.
  const today = new Date().toISOString().split('T')[0];
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_employee_id, secondary_employee_id, assignment_date, current_route_version, current_route_plan_id')
    .or(`driver_employee_id.eq.${employee.id},secondary_employee_id.eq.${employee.id}`)
    .eq('assignment_date', today)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: 'No assignment for today', route: null });
  }

  // Get the latest route plan.
  let routePlan = null;
  if (assignment.current_route_plan_id) {
    const { data } = await supabaseAdmin
      .from('route_plans')
      .select('*')
      .eq('id', assignment.current_route_plan_id)
      .maybeSingle();
    routePlan = data;
  }

  if (!routePlan) {
    // Fall back to latest by version.
    const { data } = await supabaseAdmin
      .from('route_plans')
      .select('*')
      .eq('crew_assignment_id', assignment.id)
      .order('route_version', { ascending: false })
      .limit(1)
      .maybeSingle();
    routePlan = data;
  }

  if (!routePlan) {
    // No plan exists — generate one.
    const { data: loc } = await supabaseAdmin
      .from('crew_location')
      .select('latitude, longitude')
      .eq('employee_id', employee.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const crewLat = loc?.latitude || 51.0447;
    const crewLng = loc?.longitude || -114.0719;

    try {
      routePlan = await generateRoutePlan(assignment.id, crewLat, crewLng);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to generate route plan', detail: err.message },
        { status: 500 }
      );
    }
  }

  // Check if the employee has acknowledged this version.
  const { data: ack } = await supabaseAdmin
    .from('route_acknowledgements')
    .select('id')
    .eq('route_plan_id', routePlan.id)
    .eq('employee_id', employee.id)
    .eq('route_version', routePlan.route_version)
    .maybeSingle();

  // Build canonical route response.
  const route = _buildCanonicalRoute(routePlan, assignment, !!ack);

  return NextResponse.json({ route });
}

// POST /api/employee/route-plan — acknowledge receipt of a route plan version.
//
// Body: { route_id, route_version, device_id? }
//
// Requirements:
// - Assigned employee only
// - Exact version required
// - Duplicate acknowledgment is idempotent (unique index)
// - Old version cannot be acknowledged as current
// - Future/unknown version rejected
// - Audit event written
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { route_id, route_version, device_id } = body;
  if (!route_id || route_version === undefined) {
    return NextResponse.json(
      { error: 'Missing route_id or route_version' },
      { status: 400 }
    );
  }

  // Look up the route plan.
  const { data: routePlan } = await supabaseAdmin
    .from('route_plans')
    .select('id, crew_assignment_id, route_version')
    .eq('id', route_id)
    .maybeSingle();

  if (!routePlan) {
    return NextResponse.json(
      { error: 'Route plan not found', refresh_required: true },
      { status: 404 }
    );
  }

  // Verify the employee is assigned to this route's crew assignment.
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_employee_id, secondary_employee_id, current_route_version')
    .eq('id', routePlan.crew_assignment_id)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: 'Crew assignment not found' }, { status: 404 });
  }

  const isAssigned =
    assignment.driver_employee_id === employee.id ||
    assignment.secondary_employee_id === employee.id;

  if (!isAssigned) {
    return NextResponse.json(
      { error: 'Not assigned to this route' },
      { status: 403 }
    );
  }

  // Reject future/unknown versions.
  const currentVersion = assignment.current_route_version || routePlan.route_version;
  if (route_version > currentVersion) {
    return NextResponse.json(
      {
        error: 'Unknown route version',
        submitted_route_version: route_version,
        current_route_version: currentVersion,
        refresh_required: true,
      },
      { status: 400 }
    );
  }

  // Reject old versions (acknowledging a stale version is not useful).
  if (route_version < currentVersion) {
    return NextResponse.json(
      {
        error: 'Stale route version',
        submitted_route_version: route_version,
        current_route_version: currentVersion,
        refresh_required: true,
      },
      { status: 409 }
    );
  }

  // Insert acknowledgment (idempotent via unique index).
  const { error: ackErr } = await supabaseAdmin
    .from('route_acknowledgements')
    .upsert(
      {
        route_plan_id: route_id,
        employee_id: employee.id,
        route_version: route_version,
        device_id: device_id || null,
        device_online: true,
      },
      { onConflict: 'route_plan_id,employee_id,route_version' }
    );

  if (ackErr) {
    return NextResponse.json({ error: ackErr.message }, { status: 500 });
  }

  // Write audit event to geofence_events (reusing as timeline/audit log).
  await supabaseAdmin.from('geofence_events').insert({
    employee_id: employee.id,
    booking_id: `route_ack_${route_id}`,
    event_type: 'route_acknowledged',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, acknowledged: true });
}

// Build the canonical route response from a route_plans row.
function _buildCanonicalRoute(routePlan, assignment, acknowledged) {
  const stops = (routePlan.stops || []).map((s) => ({
    stop_id: s.id,
    booking_id: s.type === 'customer' ? s.id : null,
    stop_type: s.type, // customer | landfill | fuel | donation_pickup | opportunistic
    sequence: s.sequence,
    status: s.status, // in_progress | upcoming | completed | required | proposed
    latitude: s.lat ?? null,
    longitude: s.lng ?? null,
    name: s.name || null,
    address: s.address || null,
    arrival_window_start: s.time_window || null,
    arrival_window_end: null,
    estimated_arrival: null,
    estimated_duration: null,
    capacity_before: s.capacity_before ?? null,
    capacity_after: s.capacity_after ?? null,
    paid_priority: s.type === 'customer' && s.total_price ? true : false,
    destination_type: s.type,
    total_price: s.total_price ?? null,
    load_size: s.load_size ?? null,
    donation_request_id: s.donation_request_id ?? null,
  }));

  return {
    route_id: routePlan.id,
    route_version: routePlan.route_version,
    route_status: routePlan.route_status || 'active',
    route_updated_at: routePlan.route_updated_at || routePlan.generated_at || routePlan.created_at,
    crew_assignment_id: routePlan.crew_assignment_id,
    truck_id: routePlan.crew_id || null,
    ordered_stops: stops,
    active_stop_id: routePlan.current_stop_id || null,
    route_lock: false,
    route_change_reason: routePlan.route_change_reason || routePlan.decision_reason || null,
    requires_acknowledgment: routePlan.requires_acknowledgment || false,
    acknowledged,
  };
}
