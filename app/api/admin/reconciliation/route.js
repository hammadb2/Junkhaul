import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import {
  reconcileRoute,
  signOffReconciliation,
  feedApprovedHoursToPayroll,
  getMarginReport,
} from '@/lib/reconciliation';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const groupBy = searchParams.get('group_by') || 'route_plan_id';

  try {
    if (startDate && endDate) {
      const report = await getMarginReport({ startDate, endDate, groupBy });
      return NextResponse.json({ report });
    }
    return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    switch (body.action) {
      case 'reconcile': {
        const result = await reconcileRoute({
          routePlanId: body.route_plan_id,
          actuals: body.actuals || {},
          managerId: body.manager_id,
          notes: body.notes,
        });
        return NextResponse.json(result);
      }
      case 'signoff': {
        const result = await signOffReconciliation({
          reconciliationId: body.reconciliation_id,
          managerId: body.manager_id,
          adjustments: body.adjustments || [],
          notes: body.notes,
        });
        return NextResponse.json(result);
      }
      case 'payroll_feed': {
        const result = await feedApprovedHoursToPayroll({
          reconciliationId: body.reconciliation_id,
          timesheetApprovals: body.timesheet_approvals || [],
          managerId: body.manager_id,
          payRunId: body.pay_run_id,
        });
        return NextResponse.json({ payroll_links: result });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
