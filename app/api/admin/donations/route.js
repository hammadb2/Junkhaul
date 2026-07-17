import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { assertDonationTransition } from '@/lib/donation';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('donation_requests')
    .select('*, photos:donation_request_photos(*), items:donation_request_items(*), analyses:donation_ai_analyses(*), route_matches:donation_route_matches(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donations: data || [] });
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { donation_request_id, action, reason = null, metadata = {} } = await req.json();
  if (!donation_request_id || !action) return NextResponse.json({ error: 'donation_request_id and action required' }, { status: 400 });
  const { data: current } = await supabaseAdmin.from('donation_requests').select('*').eq('id', donation_request_id).single();
  if (!current) return NextResponse.json({ error: 'Donation request not found' }, { status: 404 });

  const actionToStatus = {
    approve: 'route_waiting',
    reject: 'rejected',
    request_photos: 'needs_more_photos',
    convert_to_paid: 'paid_quote_offered',
    match_route: 'route_matched',
    offer_window: 'pickup_window_offered',
    cancel: 'cancelled',
  };
  const next = actionToStatus[action];
  if (!next) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  try {
    assertDonationTransition(current.status, next);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
  const { data, error } = await supabaseAdmin
    .from('donation_requests')
    .update({ status: next, status_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', donation_request_id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: donation_request_id,
    event_type: 'admin_donation_action',
    actor_type: 'admin',
    source: 'admin',
    before: { status: current.status },
    after: { status: next },
    reason,
    metadata: { action, ...metadata },
  });
  await recordAuditEvent({
    entity_type: 'donation_request',
    entity_id: donation_request_id,
    event_type: 'admin_donation_action',
    actor_type: 'admin',
    source: 'admin',
    before: { status: current.status },
    after: { status: next },
    reason,
    metadata: { action, ...metadata },
  });
  return NextResponse.json({ donation: data });
}
