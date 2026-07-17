import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/employee-docs?employee_id=... — all uploaded docs for an employee
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employee_id');
  const auth = await requireStaffPermission(req, {
    permission: 'employee_documents.read_sensitive',
    ownerOnly: true,
    entityType: 'employee',
    entityId: employeeId || null,
    action: 'employee_documents.read_sensitive',
    metadata: { route: '/api/admin/employee-docs' },
  });
  if (!auth.ok) return auth.response;
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
  const body = await req.json().catch(() => ({}));
  const { document_id, status, notes, reason = null } = body;
  const auth = await requireStaffPermission(req, {
    permission: 'employee_documents.verify',
    entityType: 'employee_document',
    entityId: document_id || null,
    action: 'employee_documents.verify',
    reason,
    metadata: { status },
  });
  if (!auth.ok) return auth.response;
  if (!['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be verified or rejected' }, { status: 400 });
  }
  const { data: before } = await supabaseAdmin.from('employee_documents').select('*').eq('id', document_id).maybeSingle();
  const { error } = await supabaseAdmin
    .from('employee_documents')
    .update({ status, notes: notes || null, verified_at: new Date().toISOString(), verified_by: auth.context.employee.id })
    .eq('id', document_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auditSensitiveAttempt({
    context: auth.context,
    allowed: true,
    permission: 'employee_documents.verify',
    entityType: 'employee_document',
    entityId: document_id,
    action: 'employee_documents.verify',
    reason,
    before,
    after: { status, notes: notes || null },
  });
  return NextResponse.json({ ok: true });
}
