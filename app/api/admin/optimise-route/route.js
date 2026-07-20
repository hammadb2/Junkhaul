import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { optimiseRoute } from '@/lib/route';
import { estimateProfitAsync, LOAD_LABELS } from '@/lib/pricing';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export const maxDuration = 30;

// POST { date } -> ordered list of bookings with profit estimates.
export async function POST(req) {
  const auth = await requireStaffPermission(req, { permission: 'bookings.assign', action: 'route.optimise' });
  if (!auth.ok) return auth.response;
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('job_date', date)
    .in('status', ['confirmed', 'rescheduled'])
    .order('job_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ordered = await optimiseRoute(bookings);

  // Calculate profit for each job using versioned operating-cost config.
  const withProfit = await Promise.all(ordered.map(async (b) => {
    const profit = await estimateProfitAsync({
      load_size: b.load_size,
      total_price: b.total_price,
      quadrant: b.quadrant,
    });
    return {
      position: 0, // set below
      id: b.id,
      booking_ref: b.booking_ref,
      name: b.name,
      address: b.address,
      quadrant: b.quadrant,
      job_time: b.job_time,
      lat: b.lat,
      lng: b.lng,
      load_label: LOAD_LABELS[b.load_size],
      total_price: b.total_price,
      est_truck_cost: profit.truck_cost,
      est_dump_cost: profit.dump_cost,
      est_profit: profit.profit,
      est_margin: profit.margin + '%',
    };
  }));

  // Calculate totals
  const totalRevenue = withProfit.reduce((s, b) => s + b.total_price, 0);
  const totalProfit = withProfit.reduce((s, b) => s + b.est_profit, 0);
  const totalCost = withProfit.reduce((s, b) => s + b.est_truck_cost + b.est_dump_cost, 0);

  withProfit.forEach((b, i) => { b.position = i + 1; });

  return NextResponse.json({
    order: withProfit,
    summary: {
      jobs: withProfit.length,
      total_revenue: totalRevenue,
      total_est_cost: Math.round(totalCost * 100) / 100,
      total_est_profit: Math.round(totalProfit * 100) / 100,
      avg_margin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 + '%' : '0%',
    },
  });
}
