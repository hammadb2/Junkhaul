import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/onboard/contract — sign employment contract
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { signature_typed, contract_version, contract_text_hash } = body;

  if (!signature_typed) {
    return NextResponse.json({ error: 'Typed signature is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const contractData = {
    signature_typed,
    contract_version: contract_version || '1.0',
    contract_text_hash: contract_text_hash || null,
    signed_at: now,
    employee_name: emp.name,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
  };

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      contract_signed: true,
      contract_signed_at: now,
      contract_data: contractData,
      updated_at: now,
    })
    .eq('id', emp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark the document as completed
  await supabaseAdmin
    .from('employee_documents')
    .update({ status: 'completed', uploaded_at: now })
    .eq('employee_id', emp.id)
    .eq('doc_type', 'employment_contract');

  return NextResponse.json({ ok: true, signed_at: now });
}

// GET — check contract status
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('contract_signed, contract_signed_at, contract_data')
    .eq('id', emp.id)
    .maybeSingle();

  return NextResponse.json({
    signed: !!employee?.contract_signed,
    signed_at: employee?.contract_signed_at || null,
    data: employee?.contract_data || null,
  });
}
