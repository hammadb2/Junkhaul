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

// GET /api/admin/crew/[id] — single employee details with all onboarding data
export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, email, name, first_name, last_name, phone, status, hire_date, pay_rate,
      onboarded_at, onboarding_completed_at, created_at, updated_at,
      contract_signed, contract_signed_at, contract_data,
      td1_federal_data, td1_ab_data, acknowledgments,
      drive_folder_id, invite_id, address
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  // Documents
  const { data: documents } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', id)
    .order('doc_type');

  // Invite info
  let invite = null;
  if (employee.invite_id) {
    const { data: inv } = await supabaseAdmin
      .from('employee_invites')
      .select('*')
      .eq('id', employee.invite_id)
      .maybeSingle();
    invite = inv;
  }

  // Recent job clock sessions
  const { data: recentSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, booking_id, clock_in_at, clock_out_at, duration_minutes')
    .eq('employee_id', id)
    .order('clock_in_at', { ascending: false })
    .limit(20);

  // Crew assignments
  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select('*')
    .or(`driver_employee_id.eq.${id},secondary_employee_id.eq.${id}`)
    .order('assignment_date', { ascending: false })
    .limit(20);

  return NextResponse.json({
    employee,
    documents: documents || [],
    invite,
    recent_sessions: recentSessions || [],
    assignments: assignments || [],
  });
}

// PATCH /api/admin/crew/[id] — update employee (status, pay_rate, etc)
export async function PATCH(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const allowed = [
    'status', 'pay_rate', 'first_name', 'last_name', 'name',
    'phone', 'hire_date', 'onboarding_completed_at',
  ];
  const update = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // If name not provided but first/last are, derive it
  if (!update.name && (update.first_name || update.last_name)) {
    const { data: cur } = await supabaseAdmin.from('employees').select('first_name, last_name, name').eq('id', id).maybeSingle();
    const fn = update.first_name ?? cur?.first_name ?? '';
    const ln = update.last_name ?? cur?.last_name ?? '';
    update.name = `${fn} ${ln}`.trim() || cur?.name;
  }

  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .update(update)
    .eq('id', id)
    .select('id, email, name, first_name, last_name, phone, status, pay_rate, hire_date, updated_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, employee });
}

// DELETE /api/admin/crew/[id] — terminate employee
export async function DELETE(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // End any open job clock sessions
  const now = new Date().toISOString();
  const { data: openSessions } = await supabaseAdmin
    .from('job_clock_sessions')
    .select('id, clock_in_at')
    .eq('employee_id', id)
    .is('clock_out_at', null);

  for (const s of openSessions || []) {
    const duration = Math.round((new Date(now).getTime() - new Date(s.clock_in_at).getTime()) / 60000);
    await supabaseAdmin.from('job_clock_sessions')
      .update({ clock_out_at: now, duration_minutes: duration })
      .eq('id', s.id);
  }

  // Mark as terminated (soft delete — keep records for payroll/history)
  const { error } = await supabaseAdmin
    .from('employees')
    .update({ status: 'terminated', updated_at: now })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revoke all sessions
  await supabaseAdmin.from('employee_sessions').delete().eq('employee_id', id);

  return NextResponse.json({ ok: true });
}
