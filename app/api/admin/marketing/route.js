import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: campaigns }, { data: batches }, { data: codes }, { data: attribution }, { data: funnel }, { data: bookings }, { data: donations }] = await Promise.all([
    supabaseAdmin.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('campaign_batches').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('campaign_tracking_codes').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('attribution_records').select('*').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('funnel_events').select('*').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('bookings').select('id,total_price,balance_due,status,deposit_paid,refund_amount,created_at,attribution_record_id,first_touch_attribution_id,last_touch_attribution_id').limit(1000),
    supabaseAdmin.from('donation_requests').select('id,status,created_at,attribution_record_id,first_touch_attribution_id,last_touch_attribution_id').limit(1000),
  ]);

  const byCampaign = {};
  for (const c of campaigns || []) {
    byCampaign[c.id] = {
      campaign: c,
      printed: 0,
      distributed: 0,
      cost_cents: 0,
      visits: 0,
      unique_visitors: new Set(),
      phone_submissions: 0,
      photo_uploads: 0,
      quotes: 0,
      prices_revealed: 0,
      waitlist_joins: 0,
      donation_requests: 0,
      bookings: 0,
      deposits: 0,
      completed_jobs: 0,
      cancellations: 0,
      no_shows: 0,
      booked_revenue: 0,
      collected_revenue: 0,
      refunds: 0,
    };
  }
  for (const b of batches || []) {
    const row = byCampaign[b.campaign_id];
    if (!row) continue;
    row.printed += b.planned_quantity || 0;
    row.distributed += b.actual_quantity || 0;
    row.cost_cents += (b.printing_cost_cents || 0) + (b.distribution_cost_cents || 0);
  }
  const attrById = Object.fromEntries((attribution || []).map((a) => [a.id, a]));
  for (const a of attribution || []) {
    const row = byCampaign[a.campaign_id];
    if (!row) continue;
    row.visits += 1;
    if (a.session_id) row.unique_visitors.add(a.session_id);
  }
  for (const e of funnel || []) {
    const a = attrById[e.attribution_record_id];
    const row = a?.campaign_id ? byCampaign[a.campaign_id] : null;
    if (!row) continue;
    if (e.event_type === 'phone_submission') row.phone_submissions += 1;
    if (e.event_type === 'photo_upload') row.photo_uploads += 1;
    if (e.event_type === 'quote') row.quotes += 1;
    if (e.event_type === 'price_reveal') row.prices_revealed += 1;
    if (e.event_type === 'waitlist_join') row.waitlist_joins += 1;
  }
  for (const b of bookings || []) {
    const a = attrById[b.first_touch_attribution_id] || attrById[b.last_touch_attribution_id] || attrById[b.attribution_record_id];
    const row = a?.campaign_id ? byCampaign[a.campaign_id] : null;
    if (!row) continue;
    row.bookings += 1;
    if (b.deposit_paid) row.deposits += 1;
    if (b.status === 'completed') row.completed_jobs += 1;
    if (b.status === 'cancelled') row.cancellations += 1;
    if (b.status === 'no_show') row.no_shows += 1;
    row.booked_revenue += b.total_price || 0;
    if (b.status === 'completed') row.collected_revenue += b.total_price || 0;
    row.refunds += b.refund_amount || 0;
  }
  for (const d of donations || []) {
    const a = attrById[d.first_touch_attribution_id] || attrById[d.last_touch_attribution_id] || attrById[d.attribution_record_id];
    const row = a?.campaign_id ? byCampaign[a.campaign_id] : null;
    if (row) row.donation_requests += 1;
  }

  const reports = Object.values(byCampaign).map((r) => {
    const unique = r.unique_visitors.size;
    const cost = r.cost_cents / 100;
    return {
      ...r,
      unique_visitors: unique,
      cost_per_visitor: unique ? cost / unique : null,
      cost_per_lead: r.phone_submissions ? cost / r.phone_submissions : null,
      cost_per_booking: r.bookings ? cost / r.bookings : null,
      cost_per_completed_job: r.completed_jobs ? cost / r.completed_jobs : null,
      revenue_per_hanger: r.distributed ? r.booked_revenue / r.distributed : null,
      profit_per_hanger: r.distributed ? (r.collected_revenue - cost) / r.distributed : null,
      return_on_spend: cost ? (r.collected_revenue - cost) / cost : null,
    };
  });

  return NextResponse.json({ campaigns: campaigns || [], batches: batches || [], codes: codes || [], reports });
}
