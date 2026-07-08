import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/pay-stubs — this employee's pay stubs (newest first)
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: stubs } = await supabaseAdmin
    .from('pay_stubs')
    .select(`
      id, pay_run_id, created_at,
      regular_hours, overtime_hours, total_hours,
      regular_pay, overtime_pay, gross_pay, vacation_pay,
      cpp, cpp2, ei, fed_tax, total_deductions, net_pay,
      ytd_gross, ytd_cpp, ytd_cpp2, ytd_ei, ytd_vacation,
      direct_deposit_status, direct_deposit_sent_at
    `)
    .eq('employee_id', emp.id)
    .order('created_at', { ascending: false })
    .limit(52);

  return NextResponse.json({ pay_stubs: stubs || [] });
}
