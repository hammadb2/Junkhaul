import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts } from '@/lib/dates';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

// GET /api/admin/bookings?date=YYYY-MM-DD  (defaults to next operating day view)
export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const today = edmontonNowParts().date;

  let query = supabaseAdmin
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'rescheduled', 'completed', 'no_show'])
    .order('job_date', { ascending: true })
    .order('job_time', { ascending: true });

  if (date) {
    query = query.eq('job_date', date);
  } else {
    query = query.gte('job_date', today);
  }

  const { data: bookings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Simple stats across the returned set.
  const stats = {
    jobs: bookings.length,
    revenue: bookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
    completed: bookings.filter((b) => b.status === 'completed').length,
    flagged: bookings.filter((b) => b.flag_for_review).length,
    high_risk: bookings.filter((b) => (b.no_show_risk_score || 0) >= 50).length,
  };

  return NextResponse.json({ bookings, stats });
}
