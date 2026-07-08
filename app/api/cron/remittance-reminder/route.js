import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { alertOperator } from '@/lib/sms';

export const runtime = 'nodejs';

// ============================================================
// /api/cron/remittance-reminder
//
// Runs automatically on the 10th of every month (5 days before
// the CRA remittance due date of the 15th). Checks for owed
// remittances due this month and alerts the operator.
// ============================================================

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7); // YYYY-MM

  // Find owed remittances due this month
  const { data: owed } = await supabaseAdmin
    .from('remittances')
    .select('id, due_date, amount, pay_runs(period_start, period_end)')
    .eq('status', 'owed')
    .gte('due_date', `${thisMonth}-01`)
    .lte('due_date', `${thisMonth}-31`);

  if (!owed || owed.length === 0) {
    return NextResponse.json({ ok: true, message: 'No remittances due this month' });
  }

  const total = owed.reduce((a, r) => a + Number(r.amount), 0);
  const dueDate = owed[0].due_date;

  await alertOperator(
    `CRA remittance due ${dueDate}: $${total.toFixed(2)} owed (${owed.length} pay run(s)). Pay via online banking or CRA My Business Account by the 15th. Mark paid at /admin/crew after.`
  );

  return NextResponse.json({ ok: true, owed_count: owed.length, total, due_date: dueDate });
}
