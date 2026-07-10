import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/onboard/complete — mark onboarding as complete
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify all onboarding steps are done
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('contract_signed, td1_federal_data, td1_ab_data, acknowledgments, selfie_url')
    .eq('id', emp.id)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('doc_type, status')
    .eq('employee_id', emp.id);

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
  const docStatus = {};
  for (const dt of requiredDocs) {
    const d = (docs || []).find((x) => x.doc_type === dt);
    docStatus[dt] = d?.status || 'pending';
  }

  const missing = [];
  if (!employee.contract_signed) missing.push('Contract not signed');
  if (!employee.td1_federal_data) missing.push('TD1 Federal not completed');
  if (!employee.td1_ab_data) missing.push('TD1AB not completed');
  if (!employee.acknowledgments || !employee.acknowledgments.tickets) missing.push('Acknowledgments not completed');
  if (!employee.selfie_url) missing.push('Selfie not uploaded');
  for (const [dt, status] of Object.entries(docStatus)) {
    if (status !== 'uploaded' && status !== 'verified') missing.push(`${dt} document not uploaded`);
  }

  if (missing.length > 0) {
    return NextResponse.json({ error: 'Onboarding incomplete', missing, docStatus }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('employees')
    .update({ onboarding_completed_at: now, status: 'pending_verification', updated_at: now })
    .eq('id', emp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, completed_at: now, status: 'pending_verification' });
}

// GET — check onboarding status
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('contract_signed, td1_federal_data, td1_ab_data, acknowledgments, onboarding_completed_at, status, first_name, last_name, email')
    .eq('id', emp.id)
    .maybeSingle();

  const { data: docs } = await supabaseAdmin
    .from('employee_documents')
    .select('doc_type, status, storage_url, uploaded_at')
    .eq('employee_id', emp.id);

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
  const docStatus = {};
  for (const dt of requiredDocs) {
    const d = (docs || []).find((x) => x.doc_type === dt);
    docStatus[dt] = d ? { status: d.status, uploaded: !!d.uploaded_at } : { status: 'pending', uploaded: false };
  }

  return NextResponse.json({
    employee,
    onboarding: {
      contract_signed: !!employee?.contract_signed,
      td1_federal: !!employee?.td1_federal_data,
      td1_ab: !!employee?.td1_ab_data,
      acknowledgments: employee?.acknowledgments || {},
      completed: !!employee?.onboarding_completed_at,
      documents: docStatus,
    },
  });
}
