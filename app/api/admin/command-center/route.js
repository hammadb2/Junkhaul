import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts } from '@/lib/dates';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/command-center
// Summary data for the admin home screen
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { date: today } = edmontonNowParts();

    const { data: todayBookings, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('total_price, balance_due, status, payment_status, surge_multiplier, surge_mode')
      .eq('job_date', today)
      .in('status', ['confirmed', 'completed', 'rescheduled']);

    if (bookingError) throw bookingError;

    const revenueToCollect = (todayBookings || []).reduce((sum, b) => sum + (b.balance_due || 0), 0);
    const revenueCollected = (todayBookings || []).filter(b => b.status === 'completed' && b.payment_status === 'paid').reduce((sum, b) => sum + b.total_price, 0);

    const surgeBookings = (todayBookings || []).filter(b => b.surge_multiplier && b.surge_multiplier !== 1);

    const now = new Date().toISOString();
    const { data: pendingOffers, error: offerError } = await supabaseAdmin
      .from('nearby_offers')
      .select('*')
      .gt('offer_expires_at', now)
      .order('created_at', { ascending: false })
      .limit(10);

    if (offerError) throw offerError;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: calls, error: callError } = await supabaseAdmin
      .from('call_history')
      .select('*')
      .in('sentiment', ['frustrated', 'negative'])
      .gt('call_date', oneDayAgo)
      .order('call_date', { ascending: false })
      .limit(5);

    if (callError) throw callError;

    const { data: cronHealth, error: cronError } = await supabaseAdmin
      .from('cron_health')
      .select('*')
      .order('job_name', { ascending: true });

    if (cronError) throw cronError;

    const staleJobs = [];
    const expectedWindows = {
      'abandonment-followup': 45 * 60 * 1000,
      'opportunistic-offer-live': 10 * 60 * 1000,
      'opportunistic-offer-proactive': 25 * 60 * 60 * 1000,
      'review-request': 70 * 60 * 1000,
      'demand-snapshot': 7 * 60 * 60 * 1000,
    };

    for (const job of cronHealth || []) {
      const window = expectedWindows[job.job_name];
      if (window && job.last_run_at) {
        const since = new Date() - new Date(job.last_run_at);
        if (since > window) {
          staleJobs.push({ job_name: job.job_name, minutes_since_run: Math.round(since / 60000) });
        }
      }
    }

    return NextResponse.json({
      today: {
        date: today,
        jobs: todayBookings.length,
        revenue_to_collect: revenueToCollect,
        revenue_collected: revenueCollected,
      },
      surge: {
        count: surgeBookings.length,
        avg_multiplier: surgeBookings.length ? (surgeBookings.reduce((s, b) => s + b.surge_multiplier, 0) / surgeBookings.length).toFixed(2) : '1.00',
        modes: surgeBookings.reduce((acc, b) => {
          acc[b.surge_mode || 'none'] = (acc[b.surge_mode || 'none'] || 0) + 1;
          return acc;
        }, {}),
      },
      pendingOffers: pendingOffers || [],
      urgentCalls: calls || [],
      cronHealth: cronHealth || [],
      staleJobs,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Auth guard placeholder - will be added
