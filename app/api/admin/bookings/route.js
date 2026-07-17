import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts } from '@/lib/dates';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/bookings?date=YYYY-MM-DD  (defaults to next operating day view)
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'admin.read', action: 'bookings.list' });
  if (!auth.ok) return auth.response;
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
