import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// POST /api/employee/onboard/td1 — save TD1 Federal or TD1AB form data
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { form_type, data } = body;
  // form_type: 'federal' or 'ab'

  if (!form_type || !data) {
    return NextResponse.json({ error: 'form_type and data are required' }, { status: 400 });
  }

  const column = form_type === 'federal' ? 'td1_federal_data' : 'td1_ab_data';
  const docType = form_type === 'federal' ? 'td1_federal' : 'td1_ab';

  const { error } = await supabaseAdmin
    .from('employees')
    .update({ [column]: data, updated_at: new Date().toISOString() })
    .eq('id', emp.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark the document as completed
  await supabaseAdmin
    .from('employee_documents')
    .update({ status: 'completed', uploaded_at: new Date().toISOString() })
    .eq('employee_id', emp.id)
    .eq('doc_type', docType);

  return NextResponse.json({ ok: true });
}

// GET — retrieve current TD1 data
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('td1_federal_data, td1_ab_data')
    .eq('id', emp.id)
    .maybeSingle();

  return NextResponse.json({
    federal: employee?.td1_federal_data || null,
    ab: employee?.td1_ab_data || null,
  });
}
