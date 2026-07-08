import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { uploadDocToDrive, isDriveConfigured } from '@/lib/googleDrive';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/employee/documents — list this employee's onboarding docs + status
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', emp.id)
    .order('doc_type');

  return NextResponse.json({ documents: docs || [], drive_configured: isDriveConfigured() });
}

// POST /api/employee/documents — upload a signed/filled doc.
// Multipart form: field `doc_type`, field `file` (the PDF/image).
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const docType = formData.get('doc_type');
  const file = formData.get('file');
  if (!docType || !file) {
    return NextResponse.json({ error: 'doc_type and file are required' }, { status: 400 });
  }

  const allowed = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info', 'other'];
  if (!allowed.includes(docType)) {
    return NextResponse.json({ error: 'Invalid doc_type' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${docType}-${new Date().toISOString().slice(0, 10)}-${file.name}`;

  // Upload to Google Drive (per-employee private folder) if configured.
  let driveFileId = null, driveFileUrl = null;
  if (isDriveConfigured()) {
    const full = await supabaseAdmin.from('employees').select('*').eq('id', emp.id).maybeSingle();
    const result = await uploadDocToDrive({
      employee: full.data,
      filename,
      mimeType: file.type || 'application/octet-stream',
      buffer: bytes,
    });
    driveFileId = result.drive_file_id;
    driveFileUrl = result.drive_file_url;
  }

  // Upsert the document record (status -> uploaded)
  const { data: doc, error } = await supabaseAdmin
    .from('employee_documents')
    .upsert({
      employee_id: emp.id,
      doc_type: docType,
      status: 'uploaded',
      drive_file_id: driveFileId,
      drive_file_url: driveFileUrl,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: 'employee_id,doc_type' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all required docs are now uploaded -> flag onboarded
  const required = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info'];
  const { data: allDocs } = await supabaseAdmin
    .from('employee_documents').select('doc_type, status').eq('employee_id', emp.id);
  const complete = required.every((t) => (allDocs || []).find((d) => d.doc_type === t && (d.status === 'uploaded' || d.status === 'verified')));
  if (complete && emp.status === 'pending') {
    await supabaseAdmin.from('employees')
      .update({ status: 'onboarded', onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', emp.id);
  }

  return NextResponse.json({ ok: true, document: doc, onboarding_complete: complete });
}
