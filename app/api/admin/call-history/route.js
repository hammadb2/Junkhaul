import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/call-history
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  let query = supabaseAdmin
    .from('call_history')
    .select('*')
    .limit(limit);

  if (phone) {
    const normalizedPhone = phone.replace(/^\+1/, '').replace(/\D/g, '');
    const phonePatterns = [
      `caller_number.eq.${phone}`,
      `caller_number.eq.+1${normalizedPhone}`,
      `caller_number.eq.1${normalizedPhone}`,
      `caller_number.eq.${normalizedPhone}`,
    ];
    query = query.or(phonePatterns.join(','));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sorted = (data || []).sort((a, b) => {
    const rank = { frustrated: 0, negative: 1, neutral: 2, positive: 3 };
    const rankA = rank[a.sentiment] ?? 4;
    const rankB = rank[b.sentiment] ?? 4;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.call_date) - new Date(a.call_date);
  });

  return NextResponse.json({ calls: sorted });
}
