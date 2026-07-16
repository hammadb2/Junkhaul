import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { generateRoutePlan } from '@/lib/routeOptimizer';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/employee/route-plan — returns the current route plan.
// If none exists, generates one fresh.
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find today's crew assignment for this employee
  const today = new Date().toISOString().split('T')[0];
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, driver_id, secondary_id, assignment_date')
    .or(`driver_id.eq.${employee.id},secondary_id.eq.${employee.id}`)
    .eq('assignment_date', today)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: 'No assignment for today', route_plan: null });
  }

  // Get the latest route plan
  const { data: routePlan } = await supabaseAdmin
    .from('route_plans')
    .select('*')
    .eq('crew_assignment_id', assignment.id)
    .order('route_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (routePlan) {
    return NextResponse.json({ route_plan: routePlan });
  }

  // No plan exists — generate one
  // Get crew's current location
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
    const plan = await generateRoutePlan(assignment.id, crewLat, crewLng);
    return NextResponse.json({ route_plan: plan });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate route plan', detail: err.message }, { status: 500 });
  }
}

// POST /api/employee/route-plan — acknowledge receipt of a route plan
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { route_plan_id } = body;
  if (!route_plan_id) {
    return NextResponse.json({ error: 'Missing route_plan_id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('route_acknowledgements')
    .insert({
      route_plan_id: route_plan_id,
      employee_id: employee.id,
      device_online: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
