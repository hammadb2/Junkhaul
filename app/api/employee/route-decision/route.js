import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { getLandfillDecision } from '@/lib/routeOptimizer';

export const runtime = 'nodejs';

// GET /api/employee/route-decision — returns the server-calculated
// landfill decision. The app displays this as an instruction, not a choice.
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find today's crew assignment
  const { supabaseAdmin } = await import('@/lib/supabase');
  const today = new Date().toISOString().split('T')[0];
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id')
    .or(`driver_id.eq.${employee.id},secondary_id.eq.${employee.id}`)
    .eq('assignment_date', today)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ decision: 'continue', reason: 'No assignment for today.' });
  }

  // Get crew location
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
    const decision = await getLandfillDecision(assignment.id, crewLat, crewLng);
    return NextResponse.json(decision);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to calculate decision', detail: err.message }, { status: 500 });
  }
}
