import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import {
  loadRoutePlanForDate,
  computeDailyTotals,
  validateRouteFeasibility,
  getDispatchExceptions,
  publishRoute,
  rollbackRoute,
  createScenario,
} from '@/lib/dispatch';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  return token && token === expected;
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const routePlanId = searchParams.get('route_plan_id');
  try {
    let plan = null;
    if (routePlanId) {
      const { data } = await supabaseAdmin.from('route_plans').select('*, crew_assignments(assignment_date, employee_ids)').eq('id', routePlanId).maybeSingle();
      plan = data;
    } else if (date) {
      plan = await loadRoutePlanForDate(date);
    } else {
      return NextResponse.json({ error: 'date or route_plan_id required' }, { status: 400 });
    }
    if (!plan) return NextResponse.json({ route_plan: null });

    const totals = await computeDailyTotals(plan);
    const bookingIds = (plan.stops || []).filter((s) => s.type === 'customer').map((s) => s.booking_id).filter(Boolean);
    const { data: bookings } = await supabaseAdmin.from('bookings').select('*').in('id', bookingIds);
    const exceptions = validateRouteFeasibility(plan, bookings || []);
    const persisted = await getDispatchExceptions(plan.id);
    return NextResponse.json({ route_plan: plan, totals, exceptions, persisted_exceptions: persisted });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { action } = body;
  try {
    if (action === 'publish') {
      const result = await publishRoute({ routePlanId: body.route_plan_id, publishedBy: body.published_by, reason: body.reason });
      return NextResponse.json({ route_plan: result });
    }
    if (action === 'rollback') {
      const result = await rollbackRoute({ routePlanId: body.route_plan_id, rollbackToPlanId: body.rollback_to_plan_id, rolledBackBy: body.rolled_back_by, reason: body.reason });
      return NextResponse.json({ route_plan: result });
    }
    if (action === 'scenario') {
      const result = await createScenario({ baseRoutePlanId: body.base_route_plan_id, changes: body.changes || [] });
      return NextResponse.json({ route_plan: result });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
