import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/remittance — all remittances (owed first), with pay run info
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'payroll.preview',
    ownerOnly: true,
    action: 'remittance.read',
    metadata: { route: '/api/admin/remittance' },
  });
  if (!auth.ok) return auth.response;
  const { data: rem } = await supabaseAdmin
    .from('remittances')
    .select('*, pay_runs(period_start, period_end, total_cra_remittance, status)')
    .order('due_date', { ascending: false })
    .limit(50);

  const owed = (rem || []).filter((r) => r.status === 'owed');
  const totalOwed = owed.reduce((a, r) => a + Number(r.amount || 0), 0);

  return NextResponse.json({
    remittances: rem || [],
    owed_total: Math.round(totalOwed * 100) / 100,
    owed_count: owed.length,
    next_due: owed.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null,
  });
}

// POST /api/admin/remittance — mark a remittance as paid
// Body: { remittance_id, paid_method }
export async function POST(req) {
  const { remittance_id, paid_method, reason = null } = await req.json();
  const auth = await requireStaffPermission(req, {
    permission: 'payroll.send',
    ownerOnly: true,
    entityType: 'remittance',
    entityId: remittance_id || null,
    action: 'remittance.mark_paid',
    reason,
  });
  if (!auth.ok) return auth.response;
  if (!remittance_id) return NextResponse.json({ error: 'remittance_id required' }, { status: 422 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 422 });
  const { data: before } = await supabaseAdmin.from('remittances').select('*').eq('id', remittance_id).maybeSingle();
  const { error } = await supabaseAdmin
    .from('remittances')
    .update({ status: 'paid', paid_at: new Date().toISOString(), paid_method: paid_method || 'manual' })
    .eq('id', remittance_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auditSensitiveAttempt({
    context: auth.context,
    allowed: true,
    permission: 'payroll.send',
    entityType: 'remittance',
    entityId: remittance_id,
    action: 'remittance.mark_paid',
    reason,
    before,
    after: { status: 'paid', paid_method: paid_method || 'manual' },
  });
  return NextResponse.json({ ok: true });
}
