import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/call-history
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'admin.read', action: 'call_history.list' });
  if (!auth.ok) return auth.response;

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
