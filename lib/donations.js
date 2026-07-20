// ============================================================
// donations.js
//
// Rehaul donor intake, inspection, quarantine and chain of custody.
// ============================================================

import { supabaseAdmin } from './supabase.js';

const VALID_TRANSITIONS = {
  submitted: ['evidence_review', 'reject'],
  evidence_review: ['submitted', 'provisionally_accepted', 'reject'],
  provisionally_accepted: ['evidence_review', 'route_scheduled', 'reject'],
  route_scheduled: ['provisionally_accepted', 'collected', 'reject'],
  collected: ['quarantine', 'inspected'],
  quarantine: ['inspected', 'reject'],
  inspected: ['cleaning_repair', 'sellable', 'recycle', 'reject'],
  cleaning_repair: ['inspected', 'sellable', 'recycle', 'reject'],
  sellable: ['listed', 'cleaning_repair'],
  recycle: [],
  reject: [],
  listed: [],
};

export function canTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

export async function createDonationIntake({
  tenantId,
  customerId,
  address,
  preferredPickupDate,
  items = [],
  consent = false,
  notes = '',
  client = supabaseAdmin,
}) {
  if (!consent) throw new Error('Donor consent is required');

  const { data: intake, error } = await client.from('donation_intakes').insert({
    tenant_id: tenantId,
    rehaul_customer_id: customerId,
    address,
    preferred_pickup_date: preferredPickupDate,
    consent_given: consent,
    consent_given_at: new Date().toISOString(),
    donor_notes: notes,
  }).select().single();
  if (error) throw error;

  const itemRows = items.map((it) => ({
    donation_intake_id: intake.id,
    description: it.description,
    category: it.category,
    evidence: it.evidence || {},
    ai_recommendation: it.ai_recommendation,
    ai_confidence: it.ai_confidence,
    ai_resale_estimate_cents: it.ai_resale_estimate_cents,
    physical_status: 'pending',
    decision: 'pending',
  }));
  if (itemRows.length) {
    const { error: itemError } = await client.from('donation_items').insert(itemRows);
    if (itemError) throw itemError;
  }

  return { intake, items: itemRows };
}

export async function transitionIntakeStatus({
  intakeId,
  toStatus,
  actorId,
  reason = '',
  client = supabaseAdmin,
}) {
  const { data: intake } = await client.from('donation_intakes').select('*').eq('id', intakeId).single();
  if (!intake) throw new Error('Intake not found');
  if (intake.status === toStatus) return intake;
  if (!canTransition(intake.status, toStatus)) {
    throw new Error(`Invalid transition from ${intake.status} to ${toStatus}`);
  }

  const { data, error } = await client.from('donation_intakes')
    .update({ status: toStatus })
    .eq('id', intakeId)
    .select().single();
  if (error) throw error;

  await recordCustodyEvent({
    intakeId,
    eventType: 'disposition',
    actorId,
    notes: `status:${intake.status}->${toStatus} ${reason}`.trim(),
    client,
  });

  return data;
}

export async function recordCustodyEvent({
  intakeId,
  itemId,
  eventType,
  actorId,
  location = '',
  photoUrl = '',
  notes = '',
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('donation_custody_events').insert({
    donation_intake_id: intakeId,
    donation_item_id: itemId || null,
    event_type: eventType,
    actor_id: actorId,
    location,
    photo_url: photoUrl,
    notes,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createInspection({
  itemId,
  inspectorId,
  checklist,
  passed,
  notes = '',
  client = supabaseAdmin,
}) {
  const hazardFields = ['pest', 'mold', 'odor', 'smoke', 'bodily_fluid', 'structural', 'electrical', 'recall'];
  const normalized = {};
  for (const f of hazardFields) {
    normalized[f] = checklist?.[f] ?? false;
  }

  const hasHazard = Object.values(normalized).some((v) => v === true);
  const resolvedPassed = passed ?? !hasHazard;

  const { data, error } = await client.from('inspections').insert({
    donation_item_id: itemId,
    inspector_id: inspectorId,
    checklist: normalized,
    passed: resolvedPassed,
    notes,
  }).select().single();
  if (error) throw error;

  // Update item decision and physical status based on inspection.
  const decision = resolvedPassed ? 'accept' : hasHazard ? 'quarantine' : 'reject';
  await client.from('donation_items').update({
    decision,
    physical_status: decision,
    inspected_at: new Date().toISOString(),
    decision_reason: notes,
  }).eq('id', itemId);

  return data;
}

export async function createQuarantine({
  itemId,
  location,
  reason,
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('quarantine_records').insert({
    donation_item_id: itemId,
    location,
    reason,
  }).select().single();
  if (error) throw error;

  await client.from('donation_items').update({ decision: 'quarantine', physical_status: 'quarantined' }).eq('id', itemId);
  return data;
}

export async function releaseQuarantine({
  quarantineId,
  releasedBy,
  reason,
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('quarantine_records')
    .update({ released_at: new Date().toISOString(), released_by: releasedBy })
    .eq('id', quarantineId)
    .select().single();
  if (error) throw error;

  if (data?.donation_item_id) {
    await client.from('donation_items').update({ decision: 'pending', physical_status: 'pending' }).eq('id', data.donation_item_id);
  }
  return data;
}

export async function getDonationPipeline({ tenantId, status, client = supabaseAdmin }) {
  let q = client.from('donation_intakes').select('*, donation_items(*), donation_custody_events(*)');
  q = q.eq('tenant_id', tenantId).order('updated_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
