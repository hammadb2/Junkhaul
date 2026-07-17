import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';

export const runtime = 'nodejs';

// PATCH: manual reviewer correction to a single item's AI-derived
// fields. Stored as manual_correction (never overwritten by a later
// AI re-run — lib/donationVision.js skips items with manual_correction set).
export async function PATCH(req, { params }) {
  const { id, itemId } = await params;
  const body = await req.json();
  const { reason = null, ...correction } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request_item',
    entityId: itemId,
    action: 'donations.item.correct',
    reason,
  });
  if (!auth.ok) return auth.response;

  const { data: existing } = await supabaseAdmin
    .from('donation_request_items')
    .select('*')
    .eq('id', itemId)
    .eq('donation_request_id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const allowedFields = ['category', 'subtype', 'condition', 'material', 'weight_kg_min', 'weight_kg_max', 'volume_cuft', 'suitability', 'ai_decision', 'rejection_reasons', 'recommended_destination_type', 'destination', 'quantity', 'missing_parts'];
  const patch = {};
  for (const key of allowedFields) if (correction[key] !== undefined) patch[key] = correction[key];

  const { data: updated, error } = await supabaseAdmin
    .from('donation_request_items')
    .update({
      ...patch,
      manual_correction: correction,
      corrected_by: auth.context.employee.id,
      corrected_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('donation_request_id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: id,
    event_type: 'donation_item_corrected',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_donation_review',
    before: existing,
    after: updated,
    reason,
    metadata: { item_id: itemId },
  });
  await recordAuditEvent({
    entity_type: 'donation_request_item',
    entity_id: itemId,
    event_type: 'donation_item_corrected',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_donation_review',
    before: existing,
    after: updated,
    reason,
  });

  return NextResponse.json({ item: updated });
}
