import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { scoreDestinations, selectDestination, overrideDestination } from '@/lib/donationDestinations';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, { permission: 'donations.review', entityType: 'donation_request', entityId: id, action: 'donations.destinations.read' });
  if (!auth.ok) return auth.response;

  const { data: scores } = await supabaseAdmin.from('donation_destination_scores').select('*').eq('donation_request_id', id).order('created_at', { ascending: false });
  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('selected_destination_score_id, destination_override_reason, destination_override_by').eq('id', id).maybeSingle();
  return NextResponse.json({ scores: scores || [], selected_destination_score_id: donationRequest?.selected_destination_score_id || null, destination_override_reason: donationRequest?.destination_override_reason || null });
}

// POST: { action: 'score' | 'select' | 'override', destination_score_id?, reason? }
export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { action, destination_score_id = null, reason = null } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request',
    entityId: id,
    action: `donations.destinations.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;

  if (action === 'score') {
    const scores = await scoreDestinations({ donationRequestId: id });
    const selected = await selectDestination({ donationRequestId: id, scores });
    await recordTimelineEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_destinations_scored', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', after: { selected_destination_score_id: selected?.id || null, candidate_count: scores.length } });
    return NextResponse.json({ scores, selected });
  }

  if (action === 'select') {
    if (!destination_score_id) return NextResponse.json({ error: 'destination_score_id is required' }, { status: 422 });
    const { data: score } = await supabaseAdmin.from('donation_destination_scores').select('*').eq('id', destination_score_id).eq('donation_request_id', id).maybeSingle();
    if (!score) return NextResponse.json({ error: 'Destination score not found' }, { status: 404 });
    const selected = await selectDestination({ donationRequestId: id, scores: [score] });
    return NextResponse.json({ selected });
  }

  if (action === 'override') {
    if (!reason) return NextResponse.json({ error: 'reason is required to override a destination' }, { status: 422 });
    if (!destination_score_id) return NextResponse.json({ error: 'destination_score_id is required' }, { status: 422 });
    const { data: before } = await supabaseAdmin.from('donation_requests').select('selected_destination_score_id').eq('id', id).maybeSingle();
    const updated = await overrideDestination({ donationRequestId: id, destinationScoreId: destination_score_id, reason, actorId: auth.context.employee.id });
    await recordTimelineEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_destination_overridden', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', before, after: { selected_destination_score_id: destination_score_id }, reason });
    await recordAuditEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_destination_overridden', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', before, after: { selected_destination_score_id: destination_score_id }, reason });
    return NextResponse.json({ donation: updated });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
