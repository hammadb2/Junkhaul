import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = await adminToken();
  return token === expected;
}

// GET /api/admin/employees — full admin overview:
//   - who's onboarded
//   - who's currently clocked in (with live duration)
//   - hours worked this pay period per employee (incl. overtime)
//   - onboarding doc status per employee
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, phone, status, hire_date, pay_rate, onboarded_at, created_at')
    .order('created_at', { ascending: false });

  // Open shifts (clocked in right now)
  const { data: openShifts } = await supabaseAdmin
    .from('timesheets')
    .select('id, employee_id, clock_in_at, clock_in_lat, clock_in_lng')
    .is('clock_out_at', null);
  const openByEmployee = new Map((openShifts || []).map((s) => [s.employee_id, s]));

  // Period hours: current calendar month, un-paid shifts (pay_run_id null)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: periodShifts } = await supabaseAdmin
    .from('timesheets')
    .select('employee_id, regular_hours, overtime_hours, total_hours, gross_pay')
    .is('pay_run_id', null)
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', monthStart.toISOString());

  const periodByEmployee = new Map();
  for (const s of periodShifts || []) {
    const cur = periodByEmployee.get(s.employee_id) || { regular_hours: 0, overtime_hours: 0, total_hours: 0, gross: 0 };
    cur.regular_hours += Number(s.regular_hours || 0);
    cur.overtime_hours += Number(s.overtime_hours || 0);
    cur.total_hours += Number(s.total_hours || 0);
    cur.gross += Number(s.gross_pay || 0);
    periodByEmployee.set(s.employee_id, cur);
  }

  // Doc status per employee
  const { data: allDocs } = await supabaseAdmin
    .from('employee_documents')
    .select('employee_id, doc_type, status');
  const docsByEmployee = new Map();
  for (const d of allDocs || []) {
    const arr = docsByEmployee.get(d.employee_id) || [];
    arr.push(d);
    docsByEmployee.set(d.employee_id, arr);
  }
  const required = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info'];

  const now = Date.now();
  const list = (employees || []).map((e) => {
    const open = openByEmployee.get(e.id);
    const period = periodByEmployee.get(e.id) || { regular_hours: 0, overtime_hours: 0, total_hours: 0, gross: 0 };
    const docs = docsByEmployee.get(e.id) || [];
    const uploaded = docs.filter((d) => d.status === 'uploaded' || d.status === 'verified').map((d) => d.doc_type);
    const missing = required.filter((t) => !uploaded.includes(t));
    return {
      ...e,
      clocked_in: !!open,
      clock_in_at: open?.clock_in_at || null,
      clock_in_duration_min: open ? Math.round((now - new Date(open.clock_in_at).getTime()) / 60000) : null,
      clock_in_gps: open ? { lat: open.clock_in_lat, lng: open.clock_in_lng } : null,
      period: {
        regular_hours: Math.round(period.regular_hours * 100) / 100,
        overtime_hours: Math.round(period.overtime_hours * 100) / 100,
        total_hours: Math.round(period.total_hours * 100) / 100,
        gross: Math.round(period.gross * 100) / 100,
      },
      onboarding: {
        complete: missing.length === 0,
        uploaded,
        missing,
      },
    };
  });

  return NextResponse.json({
    employees: list,
    summary: {
      total: list.length,
      onboarded: list.filter((e) => e.status === 'onboarded' || e.status === 'active').length,
      pending: list.filter((e) => e.status === 'pending').length,
      clocked_in_now: list.filter((e) => e.clocked_in).length,
    },
  });
}
