import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { estimateProfit } from '@/lib/pricing';

export const runtime = 'nodejs';

// GET /api/admin/quadrant-profit — per-quadrant profit dashboard.
// Uses the estimateProfit function from lib/pricing.js to compute
// actual profit per booking based on quadrant, load size, and price.
//
// Query params:
//   ?days=30  — look back N days (default 30)
//   ?summary=true — return aggregated summary only
export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get('days') || '30', 10);
  const summaryOnly = searchParams.get('summary') === 'true';

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, name, quadrant, load_size, total_price, job_date, status, source')
    .not('quadrant', 'is', null)
    .gte('job_date', since)
    .order('job_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute profit per booking
  const withProfit = (bookings || []).map((b) => {
    const profit = estimateProfit({
      load_size: b.load_size,
      total_price: b.total_price,
      quadrant: b.quadrant,
    });
    return {
      ...b,
      truck_cost: profit.truck_cost,
      dump_cost: profit.dump_cost,
      total_cost: profit.total_cost,
      profit: profit.profit,
      margin: profit.margin,
    };
  });

  // Aggregate by quadrant
  const quadrants = ['NE', 'NW', 'SE', 'SW'];
  const summary = quadrants.map((q) => {
    const qBookings = withProfit.filter((b) => b.quadrant === q);
    const completed = qBookings.filter((b) => b.status === 'completed');
    const totalRevenue = qBookings.reduce((s, b) => s + b.total_price, 0);
    const totalProfit = qBookings.reduce((s, b) => s + b.profit, 0);
    const completedRevenue = completed.reduce((s, b) => s + b.total_price, 0);
    const completedProfit = completed.reduce((s, b) => s + b.profit, 0);
    const avgMargin = qBookings.length > 0
      ? Math.round((qBookings.reduce((s, b) => s + b.margin, 0) / qBookings.length) * 10) / 10
      : 0;

    return {
      quadrant: q,
      total_jobs: qBookings.length,
      completed_jobs: completed.length,
      cancelled_jobs: qBookings.filter((b) => b.status === 'cancelled').length,
      no_show_jobs: qBookings.filter((b) => b.status === 'no_show').length,
      total_revenue: Math.round(totalRevenue),
      total_profit: Math.round(totalProfit),
      completed_revenue: Math.round(completedRevenue),
      completed_profit: Math.round(completedProfit),
      avg_margin: avgMargin,
      avg_job_value: qBookings.length > 0 ? Math.round(totalRevenue / qBookings.length) : 0,
      // Growth Engine: density indicator for expansion gate decisions
      density_score: qBookings.length, // jobs per quadrant in the period
    };
  });

  // Sort by profit descending
  summary.sort((a, b) => b.total_profit - a.total_profit);

  // Overall totals
  const totals = {
    total_jobs: withProfit.length,
    total_revenue: Math.round(withProfit.reduce((s, b) => s + b.total_price, 0)),
    total_profit: Math.round(withProfit.reduce((s, b) => s + b.profit, 0)),
    avg_margin: withProfit.length > 0
      ? Math.round((withProfit.reduce((s, b) => s + b.margin, 0) / withProfit.length) * 10) / 10
      : 0,
    best_quadrant: summary[0]?.quadrant || null,
    worst_quadrant: summary[summary.length - 1]?.quadrant || null,
  };

  if (summaryOnly) {
    return NextResponse.json({ summary, totals, period_days: days });
  }

  return NextResponse.json({
    summary,
    totals,
    bookings: withProfit,
    period_days: days,
  });
}
