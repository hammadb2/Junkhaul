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

// GET /api/admin/referrals
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: referrals, error } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leaderboard = {};
  for (const r of referrals || []) {
    if (!leaderboard[r.referrer_phone]) {
      leaderboard[r.referrer_phone] = {
        referrer_phone: r.referrer_phone,
        completed: 0,
        pending: 0,
        total_earned: 0,
      };
    }
    if (r.status === 'completed') {
      leaderboard[r.referrer_phone].completed += 1;
      leaderboard[r.referrer_phone].total_earned += r.referrer_reward_amount || 0;
    } else if (r.status === 'pending') {
      leaderboard[r.referrer_phone].pending += 1;
    }
  }

  const leaderboardArray = Object.values(leaderboard).sort(
    (a, b) => b.completed - a.completed || b.total_earned - a.total_earned
  );

  return NextResponse.json({ referrals: referrals || [], leaderboard: leaderboardArray });
}

// Auth guard placeholder - will be added
