import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DOC_BUCKET = 'employee-documents';

function parseLicenseText(text) {
  const cleaned = (text || '').replace(/\r/g, '\n');
  const fields = {};

  // Common Canadian date formats in licenses
  const dateMatches = cleaned.match(/\b(19|20)\d{2}[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/g) || [];
  if (dateMatches[0]) fields.date_1 = dateMatches[0];
  if (dateMatches[1]) fields.date_2 = dateMatches[1];

  const dobLabel = cleaned.match(/(?:DOB|Date of Birth)[:\s]*([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})/i);
  if (dobLabel?.[1]) fields.dob = dobLabel[1];

  const expLabel = cleaned.match(/(?:EXP|Expiry|Expires)[:\s]*([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})/i);
  if (expLabel?.[1]) fields.expiry = expLabel[1];

  const licenseNo = cleaned.match(/(?:LIC(?:ENCE|ENSE)?(?:\s*NO|\s*#)?|DLN)[:\s]*([A-Z0-9-]{5,20})/i);
  if (licenseNo?.[1]) fields.license_number = licenseNo[1].toUpperCase();

  // Heuristic fallback for license number
  if (!fields.license_number) {
    const fallback = cleaned.match(/\b[A-Z][0-9]{7,15}\b/);
    if (fallback?.[0]) fields.license_number = fallback[0];
  }

  return fields;
}

async function extractOcrForLicense(bytes) {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(bytes);
    await worker.terminate();
    const text = data?.text || '';
    return {
      text,
      fields: parseLicenseText(text),
    };
  } catch (e) {
    console.warn('OCR extraction failed:', e?.message || e);
    return { text: '', fields: {} };
  }
}

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

  const allowed = [
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
    'other',
  ];
  if (!allowed.includes(docType)) {
    return NextResponse.json({ error: 'Invalid doc_type' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const storagePath = `${emp.id}/${docType}-${Date.now()}.${ext}`;
  const mimeType = file.type || 'image/jpeg';

  // Ensure bucket exists in every environment
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.id === DOC_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(DOC_BUCKET, { public: true });
  }

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

  let extractedData = null;
  let ocrText = null;
  if (docType === 'drivers_license_front' || docType === 'drivers_license_back') {
    const ocr = await extractOcrForLicense(bytes);
    extractedData = ocr.fields;
    ocrText = ocr.text || null;
  }

  // Upsert the document record
  const { data: doc, error } = await supabaseAdmin
    .from('employee_documents')
    .upsert({
      employee_id: emp.id,
      doc_type: docType,
      status: 'uploaded',
      storage_url: storageUrl,
      storage_path: storagePath,
      extracted_data: extractedData,
      ocr_text: ocrText,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: 'employee_id,doc_type' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge extracted license fields on employee profile for admin review
  if (extractedData && Object.keys(extractedData).length > 0) {
    const { data: currentEmp } = await supabaseAdmin
      .from('employees')
      .select('license_data')
      .eq('id', emp.id)
      .maybeSingle();
    const merged = {
      ...(currentEmp?.license_data || {}),
      ...extractedData,
      updated_at: new Date().toISOString(),
    };
    await supabaseAdmin
      .from('employees')
      .update({ license_data: merged })
      .eq('id', emp.id);
  }

  // Check if all required docs are now uploaded -> flag pending verification
  // Admin must approve before employee is fully onboarded
  const required = [
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
  ];
  const { data: allDocs } = await supabaseAdmin
    .from('employee_documents').select('doc_type, status').eq('employee_id', emp.id);
  const complete = required.every((t) => (allDocs || []).find((d) => d.doc_type === t && (d.status === 'uploaded' || d.status === 'verified')));
  if (complete && emp.status === 'pending') {
    await supabaseAdmin.from('employees')
      .update({ status: 'pending_verification', updated_at: new Date().toISOString() })
      .eq('id', emp.id);
  }

  return NextResponse.json({ ok: true, document: doc, extracted_data: extractedData, onboarding_complete: complete });
}
