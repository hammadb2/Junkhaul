import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'reports.read', action: 'earnings.read' });
  if (!auth.ok) return auth.response;
  const { data: completed } = await supabaseAdmin
    .from('bookings')
    .select('total_price, job_date, load_size, source, created_at')
    .eq('status', 'completed')
    .order('job_date', { ascending: true });

  const { data: upcoming } = await supabaseAdmin
    .from('bookings')
    .select('total_price, job_date, load_size, source')
    .in('status', ['confirmed', 'rescheduled'])
    .order('job_date', { ascending: true });

  const { data: allBookings } = await supabaseAdmin
    .from('bookings')
    .select('source, status, total_price')
    .not('status', 'eq', 'pending_payment');

  const totalEarned = (completed || []).reduce((s, b) => s + b.total_price, 0);
  const totalPipeline = (upcoming || []).reduce((s, b) => s + b.total_price, 0);
  const completedJobs = (completed || []).length;
  const avgJobValue = completedJobs > 0 ? Math.round(totalEarned / completedJobs) : 0;

  const sourceMap = {};
  for (const b of allBookings || []) {
    const s = b.source || 'web';
    if (!sourceMap[s]) sourceMap[s] = { count: 0, revenue: 0 };
    sourceMap[s].count += 1;
    sourceMap[s].revenue += b.total_price || 0;
  }

  const byDate = {};
  for (const b of completed || []) {
    if (!byDate[b.job_date]) byDate[b.job_date] = { jobs: 0, revenue: 0 };
    byDate[b.job_date].jobs += 1;
    byDate[b.job_date].revenue += b.total_price;
  }

  return NextResponse.json({
    totalEarned,
    totalPipeline,
    completedJobs,
    avgJobValue,
    sourceBreakdown: sourceMap,
    byDate,
    upcomingJobs: (upcoming || []).length,
  });
}
