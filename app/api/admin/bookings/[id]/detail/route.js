import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const [
    { data: lead },
    { data: ledger },
    { data: timeline },
    { data: audit },
    { data: messages },
    { data: attribution },
    { data: calls },
    { data: serviceRequests },
    { data: refundRequests },
  ] = await Promise.all([
    booking.lead_id ? supabaseAdmin.from('leads').select('*, quotes:lead_quotes(*)').eq('id', booking.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    supabaseAdmin.from('quote_price_ledger').select('*').eq('booking_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('timeline_events').select('*').eq('entity_type', 'booking').eq('entity_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('audit_events').select('*').eq('entity_type', 'booking').eq('entity_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('messages').select('*').eq('booking_id', id).order('sent_at', { ascending: true }),
    supabaseAdmin.from('attribution_records').select('*, campaign:marketing_campaigns(*), batch:campaign_batches(*)').or(`booking_id.eq.${id},id.eq.${booking.first_touch_attribution_id},id.eq.${booking.last_touch_attribution_id},id.eq.${booking.attribution_record_id}`).order('created_at', { ascending: true }),
    supabaseAdmin.from('phone_calls').select('*').eq('booking_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('service_requests').select('*').or(`booking_id.eq.${id},booking_ref.eq.${booking.booking_ref}`).order('created_at', { ascending: false }),
    supabaseAdmin.from('refund_requests').select('*').or(`booking_id.eq.${id},booking_ref.eq.${booking.booking_ref}`).order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({
    booking,
    lead,
    pricing_ledger: ledger || [],
    timeline: timeline || [],
    audit: audit || [],
    messages: messages || [],
    attribution: attribution || [],
    calls: calls || [],
    service_requests: serviceRequests || [],
    refund_requests: refundRequests || [],
  });
}
