import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DOC_BUCKET = 'employee-documents';

// GET /api/employee/documents — list this employee's onboarding docs + status
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', emp.id)
    .order('doc_type');

  return NextResponse.json({ documents: docs || [] });
}

// POST /api/employee/documents — upload a document (SIN, license, TD1, etc.)
// Multipart form: field `doc_type`, field `file` (the image/PDF).
// Stored in Supabase Storage bucket `employee-documents`.
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const docType = formData.get('doc_type');
  const file = formData.get('file');
  if (!docType || !file) {
    return NextResponse.json({ error: 'doc_type and file are required' }, { status: 400 });
  }

  const allowed = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info', 'sin_document', 'drivers_license', 'other'];
  if (!allowed.includes(docType)) {
    return NextResponse.json({ error: 'Invalid doc_type' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const storagePath = `${emp.id}/${docType}-${Date.now()}.${ext}`;
  const mimeType = file.type || 'image/jpeg';

  // Upload to Supabase Storage
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadErr) {
    console.error('Document upload failed:', uploadErr);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(DOC_BUCKET)
    .getPublicUrl(storagePath);

  const storageUrl = urlData.publicUrl;

  // Upsert the document record
  const { data: doc, error } = await supabaseAdmin
    .from('employee_documents')
    .upsert({
      employee_id: emp.id,
      doc_type: docType,
      status: 'uploaded',
      storage_url: storageUrl,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: 'employee_id,doc_type' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all required docs are now uploaded -> flag onboarded
  const required = ['employment_contract', 'td1_federal', 'td1_ab', 'id', 'banking_info', 'sin_document', 'drivers_license'];
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
