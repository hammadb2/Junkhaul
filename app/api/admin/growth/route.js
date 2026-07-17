import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/growth
// Returns opportunistic offers, recent surge snapshots, and abandonment funnel
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'reports.read', action: 'growth.read' });
  if (!auth.ok) return auth.response;
  try {
    const { data: offers, error: offersError } = await supabaseAdmin
      .from('nearby_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (offersError) throw offersError;

    const { data: snapshots, error: snapError } = await supabaseAdmin
      .from('slot_demand_snapshots')
      .select('*')
      .order('snapshot_at', { ascending: false })
      .limit(50);

    if (snapError) throw snapError;

    const { data: funnel, error: funnelError } = await supabaseAdmin
      .from('leads')
      .select('follow_up_sent, abandonment_sms_sent, final_reminder_sent, converted_to_booking_id')
      .not('quote_revealed_at', 'is', null);

    if (funnelError) throw funnelError;

    const funnelStats = {
      quoted: funnel.length,
      touch1: 0,
      touch2: 0,
      touch3: 0,
      converted: 0,
    };

    for (const l of funnel) {
      if (l.converted_to_booking_id) funnelStats.converted += 1;
      else if (l.final_reminder_sent) funnelStats.touch3 += 1;
      else if (l.abandonment_sms_sent) funnelStats.touch2 += 1;
      else if (l.follow_up_sent) funnelStats.touch1 += 1;
    }

    const { data: cronHealth, error: cronError } = await supabaseAdmin
      .from('cron_health')
      .select('*')
      .order('job_name', { ascending: true });

    if (cronError) throw cronError;

    return NextResponse.json({
      offers: offers || [],
      snapshots: snapshots || [],
      funnel: funnelStats,
      cronHealth: cronHealth || [],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Auth guard placeholder - will be added
