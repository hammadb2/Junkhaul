import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertDonationTransition } from '@/lib/donation';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';
import { sendSMS } from '@/lib/sms';
import { requireStaffPermission } from '@/lib/staffAuth';
import { computeCapacityEstimate } from '@/lib/donationCapacity';
import { scoreDestinations, selectDestination } from '@/lib/donationDestinations';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    action: 'donations.read',
    metadata: { route: '/api/admin/donations' },
  });
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin
    .from('donation_requests')
    .select('*, photos:donation_request_photos(*), items:donation_request_items(*), analyses:donation_ai_analyses(*), route_matches:donation_route_matches(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donations: data || [] });
}

export async function POST(req) {
  const { donation_request_id, action, reason = null, metadata = {}, destination_id = null, item_corrections = null } = await req.json();
  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request',
    entityId: donation_request_id || null,
    action: `donation.${action}`,
    reason,
    metadata: { action },
  });
  if (!auth.ok) return auth.response;
  if (!donation_request_id || !action) return NextResponse.json({ error: 'donation_request_id and action required' }, { status: 422 });
  const { data: current } = await supabaseAdmin.from('donation_requests').select('*').eq('id', donation_request_id).single();
  if (!current) return NextResponse.json({ error: 'Donation request not found' }, { status: 404 });
  if (['approve', 'reject', 'request_photos', 'convert_to_paid', 'cancel'].includes(action) && !reason) {
    return NextResponse.json({ error: 'reason is required for this donation action' }, { status: 422 });
  }

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
  if (Array.isArray(item_corrections)) {
    for (const correction of item_corrections) {
      if (!correction.id) continue;
      await supabaseAdmin
        .from('donation_request_items')
        .update({
          category: correction.category,
          condition: correction.condition,
          ai_decision: correction.decision,
          rejection_reasons: correction.rejection_reasons || [],
          destination: correction.destination || null,
        })
        .eq('id', correction.id)
        .eq('donation_request_id', donation_request_id);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('donation_requests')
    .update({
      status: next,
      status_reason: reason,
      destination_id: destination_id || current.destination_id,
      reviewed_by: auth.context.employee.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', donation_request_id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === 'approve') {
    try {
      const { data: existingCapacity } = await supabaseAdmin.from('donation_capacity_estimates').select('id').eq('donation_request_id', donation_request_id).limit(1).maybeSingle();
      if (!existingCapacity) await computeCapacityEstimate({ donationRequestId: donation_request_id, actorId: auth.context.employee.id });
      const scores = await scoreDestinations({ donationRequestId: donation_request_id });
      await selectDestination({ donationRequestId: donation_request_id, scores });
    } catch (e) {
      console.error('post-approval capacity/destination scoring failed:', e.message);
    }
  }

  let message = null;
  if (['request_photos', 'reject', 'convert_to_paid', 'approve'].includes(action) && current.phone) {
    const text = {
      request_photos: 'Thanks for your donation pickup request. We need a few more photos before review can continue. Please upload clear full-item, condition, damage, and quantity/context photos.',
      reject: 'Thanks for your donation pickup request. These items are not approved for free donation pickup based on the submitted details/photos. We can still help with a paid junk removal quote.',
      convert_to_paid: 'Your items are not eligible for free donation pickup, but we can offer a paid junk removal quote if you would like to continue.',
      approve: 'Your donation items passed review and are now waiting for route availability. This does not confirm pickup yet; we will text if a route-fit window opens.',
    }[action];
    try {
      message = await sendSMS(current.phone, text, {
        donation_request_id,
        message_type: `donation_${action}`,
        workflow_action: `donation_${action}`,
      });
    } catch (e) {
      message = { ok: false, error: e.message };
    }
  }

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: donation_request_id,
    event_type: 'admin_donation_action',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_donation_review',
    before: { status: current.status },
    after: { status: next },
    reason,
    metadata: { action, message, item_corrections_count: Array.isArray(item_corrections) ? item_corrections.length : 0, ...metadata },
  });
  await recordAuditEvent({
    entity_type: 'donation_request',
    entity_id: donation_request_id,
    event_type: 'admin_donation_action',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_donation_review',
    before: current,
    after: data,
    reason,
    metadata: { action, message, item_corrections_count: Array.isArray(item_corrections) ? item_corrections.length : 0, ...metadata },
  });
  return NextResponse.json({ donation: data });
}
