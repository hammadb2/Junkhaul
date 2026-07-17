import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/t4s?year=2026 — all T4 slips for a tax year
export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'employees.read_sin',
    ownerOnly: true,
    action: 't4_slips.read',
    metadata: { route: '/api/admin/t4s' },
  });
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || (new Date().getFullYear() - 1);

  const { data: slips } = await supabaseAdmin
    .from('t4_slips')
    .select(`
      *,
      employees(name, email)
    `)
    .eq('tax_year', year)
    .order('created_at', { ascending: false });

  return NextResponse.json({ t4_slips: slips || [], tax_year: year });
}
