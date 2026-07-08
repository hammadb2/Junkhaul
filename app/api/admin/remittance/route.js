import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

// GET /api/admin/remittance — all remittances (owed first), with pay run info
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { remittance_id, paid_method } = await req.json();
  const { error } = await supabaseAdmin
    .from('remittances')
    .update({ status: 'paid', paid_at: new Date().toISOString(), paid_method: paid_method || 'manual' })
    .eq('id', remittance_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
