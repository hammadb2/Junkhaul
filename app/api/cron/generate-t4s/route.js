import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { alertOperator } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/generate-t4s
//
// Runs automatically on January 31 each year. Generates T4 slips
// for every employee who had earnings in the previous tax year,
// by summing up their pay stubs from that year.
//
// T4 boxes:
//   Box 14: employment income (gross wages + vacation pay)
//   Box 16: CPP pensionable earnings (= box 26)
//   Box 17: CPP contribution
//   Box 18: EI insurable earnings
//   Box 19: EI premium
//   Box 22: income tax deducted (fed + prov combined)
//   Box 28: CPP2 contribution (if any)
// ============================================================

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const taxYear = today.getFullYear() - 1; // T4s are for the PREVIOUS year
  const yearStart = `${taxYear}-01-01`;
  const yearEnd = `${taxYear}-12-31`;

  // Check if T4s already exist for this year
  const { data: existing } = await supabaseAdmin
    .from('t4_slips')
    .select('id')
    .eq('tax_year', taxYear)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, message: `T4s for ${taxYear} already generated` });
  }

  // Get all employees who had pay stubs in the tax year
  const { data: stubs } = await supabaseAdmin
    .from('pay_stubs')
    .select(`
      employee_id, gross_pay, cpp, cpp2, ei, fed_tax,
      ytd_pensionable_earnings, ytd_insurable_earnings, vacation_pay
    `)
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd + 'T23:59:59');

  if (!stubs || stubs.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, message: `No pay stubs for ${taxYear}` });
  }

  // Aggregate per employee
  const byEmp = new Map();
  for (const s of stubs) {
    const cur = byEmp.get(s.employee_id) || {
      employment_income: 0, cpp_pensionable: 0, cpp_contribution: 0,
      ei_insurable: 0, ei_premium: 0, income_tax: 0,
      cpp2_contribution: 0, vacation_pay: 0,
    };
    cur.employment_income += Number(s.gross_pay || 0);
    cur.cpp_pensionable += Number(s.ytd_pensionable_earnings || 0);
    cur.cpp_contribution += Number(s.cpp || 0);
    cur.ei_insurable += Number(s.ytd_insurable_earnings || 0);
    cur.ei_premium += Number(s.ei || 0);
    cur.income_tax += Number(s.fed_tax || 0);
    cur.cpp2_contribution += Number(s.cpp2 || 0);
    cur.vacation_pay += Number(s.vacation_pay || 0);
    byEmp.set(s.employee_id, cur);
  }

  // For YTD fields, use the LAST stub of the year per employee (which has
  // the correct cumulative YTD). The sum above is for non-YTD fields.
  const lastStubByEmp = new Map();
  for (const s of [...stubs].reverse()) {
    if (!lastStubByEmp.has(s.employee_id)) lastStubByEmp.set(s.employee_id, s);
  }

  // Generate T4 slips
  const t4Rows = [];
  for (const [employeeId, agg] of byEmp) {
    const last = lastStubByEmp.get(employeeId);
    t4Rows.push({
      employee_id: employeeId,
      tax_year: taxYear,
      employment_income: Math.round(agg.employment_income * 100) / 100,
      cpp_pensionable_earnings: Math.round(Number(last.ytd_pensionable_earnings || agg.cpp_pensionable) * 100) / 100,
      cpp_contribution: Math.round(agg.cpp_contribution * 100) / 100,
      ei_insurable_earnings: Math.round(Number(last.ytd_insurable_earnings || agg.ei_insurable) * 100) / 100,
      ei_premium: Math.round(agg.ei_premium * 100) / 100,
      income_tax_deducted: Math.round(agg.income_tax * 100) / 100,
      cpp2_pensionable_earnings: Math.round(Number(last.ytd_pensionable_earnings || 0) * 100) / 100,
      cpp2_contribution: Math.round(agg.cpp2_contribution * 100) / 100,
      vacation_pay_included: Math.round(agg.vacation_pay * 100) / 100,
      status: 'generated',
    });
  }

  const { error } = await supabaseAdmin.from('t4_slips').insert(t4Rows);
  if (error) {
    await alertOperator(`T4 generation FAILED for tax year ${taxYear}: ${error.message}. Check /admin/crew.`);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await alertOperator(`T4 slips generated for tax year ${taxYear}: ${t4Rows.length} employees. Review and file at /admin/crew before Feb 28 deadline.`);

  return NextResponse.json({ ok: true, tax_year: taxYear, count: t4Rows.length });
}
