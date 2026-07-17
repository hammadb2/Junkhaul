import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { computeCapacityEstimate, applyCapacityCorrection, getEffectiveCapacityEstimate } from '@/lib/donationCapacity';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, { permission: 'donations.review', entityType: 'donation_request', entityId: id, action: 'donations.capacity.read' });
  if (!auth.ok) return auth.response;

  const [{ data: history }, effective] = await Promise.all([
    supabaseAdmin.from('donation_capacity_estimates').select('*').eq('donation_request_id', id).order('version', { ascending: false }),
    getEffectiveCapacityEstimate(id),
  ]);
  return NextResponse.json({ history: history || [], effective });
}

// POST: { action: 'recompute' | 'correct', correction?, reason? }
export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { action, correction = {}, reason = null } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request',
    entityId: id,
    action: `donations.capacity.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;

  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('id').eq('id', id).maybeSingle();
  if (!donationRequest) return NextResponse.json({ error: 'Donation request not found' }, { status: 404 });

  if (action === 'recompute') {
    const estimate = await computeCapacityEstimate({ donationRequestId: id, actorId: auth.context.employee.id });
    await recordTimelineEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_capacity_recomputed', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', after: estimate, reason });
    return NextResponse.json({ estimate });
  }

  if (action === 'correct') {
    if (!reason) return NextResponse.json({ error: 'reason is required for a capacity correction' }, { status: 422 });
    const before = await getEffectiveCapacityEstimate(id);
    const estimate = await applyCapacityCorrection({ donationRequestId: id, correction, actorId: auth.context.employee.id, reason });
    await recordTimelineEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_capacity_corrected', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', before, after: estimate, reason });
    await recordAuditEvent({ entity_type: 'donation_request', entity_id: id, event_type: 'donation_capacity_corrected', actor_type: 'employee', actor_id: auth.context.employee.id, source: 'admin_donation_review', before, after: estimate, reason });
    return NextResponse.json({ estimate });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
