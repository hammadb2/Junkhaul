import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, encryptField } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/onboard/banking — save encrypted banking info
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bank_name, institution_number, transit_number, account_number } = body;

  if (!account_number) {
    return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
  }

  // Encrypt sensitive banking data
  const bankingEnc = encryptField(JSON.stringify({
    bank_name: bank_name || null,
    institution_number: institution_number || null,
    transit_number: transit_number || null,
    account_number,
  }));

  // Store as a document with encrypted payload
  const { data: existing } = await supabaseAdmin
    .from('employee_documents')
    .select('id')
    .eq('employee_id', emp.id)
    .eq('doc_type', 'banking_info')
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('employee_documents')
      .update({ status: 'completed', encrypted_data: bankingEnc, uploaded_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from('employee_documents')
      .insert({ employee_id: emp.id, doc_type: 'banking_info', status: 'completed', encrypted_data: bankingEnc });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
