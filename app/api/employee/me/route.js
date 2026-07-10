import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, decryptField } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/me — current employee profile + onboarding status
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: full } = await supabaseAdmin
    .from('employees').select('*').eq('id', emp.id).maybeSingle();

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('doc_type, status, uploaded_at, verified_at')
    .eq('employee_id', emp.id);

  const onboardingComplete = (docs || []).every((d) => d.status === 'uploaded' || d.status === 'verified');
  const requiredDocs = [
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
  ];

  return NextResponse.json({
    employee: {
      id: full.id,
      email: full.email,
      name: full.name,
      phone: full.phone,
      address: full.address,
      status: full.status,
      hire_date: full.hire_date,
      pay_rate: full.pay_rate,
      onboarded: full.status === 'onboarded' || full.status === 'active',
      pending_verification: full.status === 'pending_verification',
      onboarding_completed_at: full.onboarding_completed_at,
      has_banking: !!full.bank_account_enc,
      has_sin: !!full.sin_enc,
      td1_federal_claim: full.td1_federal_claim,
      td1_ab_claim: full.td1_ab_claim,
    },
    documents: docs || [],
    onboarding: {
      complete: onboardingComplete,
      required: requiredDocs,
      uploaded: (docs || []).filter((d) => d.status === 'uploaded' || d.status === 'verified').map((d) => d.doc_type),
      missing: requiredDocs.filter((t) => !((docs || []).find((d) => d.doc_type === t && (d.status === 'uploaded' || d.status === 'verified')))),
    },
    drive_configured: false,
  });
}

// PUT /api/employee/me — update profile (TD1 claims, banking, address)
export async function PUT(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates = {};
  const allowed = ['phone', 'address', 'td1_federal_claim', 'td1_ab_claim'];
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  // Banking info (encrypted at rest)
  if (body.bank_institution && body.bank_transit && body.bank_account) {
    const { encryptField } = await import('@/lib/employeeAuth');
    updates.bank_institution = body.bank_institution;
    updates.bank_transit = body.bank_transit;
    updates.bank_account_enc = encryptField(body.bank_account);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('employees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', emp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
