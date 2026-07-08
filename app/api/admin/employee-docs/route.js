import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

// GET /api/admin/employee-docs?employee_id=... — all uploaded docs for an employee
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  if (!employeeId) return NextResponse.json({ error: 'employee_id required' }, { status: 400 });

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('doc_type');

  return NextResponse.json({ documents: docs || [] });
}

// POST /api/admin/employee-docs — verify/reject a doc
// Body: { document_id, status: 'verified'|'rejected', notes? }
export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { document_id, status, notes } = await req.json();
  if (!['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be verified or rejected' }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from('employee_documents')
    .update({ status, notes: notes || null, verified_at: new Date().toISOString(), verified_by: 'admin' })
    .eq('id', document_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
