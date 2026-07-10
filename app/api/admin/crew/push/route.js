import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { sendPushToEmployee, sendPushToEmployees } from '@/lib/pushNotifications';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = await adminToken();
  return token === expected;
}

// GET /api/admin/crew/push — list active employees with push subscription counts
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, name, first_name, last_name, status')
    .in('status', ['active', 'onboarded'])
    .order('first_name', { ascending: true });

  // Fetch push subscription counts per employee
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('employee_id');

  const subCounts = new Map();
  for (const s of subs || []) {
    subCounts.set(s.employee_id, (subCounts.get(s.employee_id) || 0) + 1);
  }

  const list = (employees || []).map((e) => ({
    id: e.id,
    name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
    push_subscriptions: subCounts.get(e.id) || 0,
  }));

  return NextResponse.json({
    employees: list,
    total_subscriptions: (subs || []).length,
  });
}

// POST /api/admin/crew/push — send a push notification to crew
// Body: { target: 'all' | 'individual', employee_id?, title, body, url? }
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { target, employee_id, title, body: messageBody, url } = body;

  if (!title || !messageBody) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const payload = {
    title: String(title).slice(0, 200),
    body: String(messageBody).slice(0, 1000),
    url: url || '/portal/schedule',
  };

  let sent = 0;
  let totalSubs = 0;
  let errors = [];

  if (target === 'all') {
    // Fetch all active employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id')
      .in('status', ['active', 'onboarded']);

    const ids = (employees || []).map((e) => e.id);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, totalSubs: 0, message: 'No active employees' });
    }

    const results = await sendPushToEmployees(ids, payload);
    for (const r of results) {
      if (r && typeof r.sent === 'number') sent += r.sent;
      if (r && typeof r.total === 'number') totalSubs += r.total;
      if (r && r.error) errors.push(r.error);
    }
  } else if (target === 'individual') {
    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id is required for individual target' }, { status: 400 });
    }
    const result = await sendPushToEmployee(employee_id, payload);
    sent = result?.sent || 0;
    totalSubs = result?.total || 0;
    if (result?.error) errors.push(result.error);
  } else {
    return NextResponse.json({ error: 'target must be "all" or "individual"' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    sent,
    totalSubs,
    message: totalSubs === 0 ? 'No devices registered — crew members need to open the app and allow notifications first' : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });
}
