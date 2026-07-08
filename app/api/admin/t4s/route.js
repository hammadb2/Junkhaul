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

// GET /api/admin/t4s?year=2026 — all T4 slips for a tax year
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
