// ============================================================
// alerts.js
//
// Business and operational alerts: under-margin, override, overweight,
// contamination, missing actuals, negative contribution, inventory
// discrepancy, stale quarantine, failed delivery, AI drift, webhook failure.
// ============================================================

import { supabaseAdmin } from './supabase.js';

const ALERT_CATEGORIES = [
  'under_margin','override','overweight','contamination','missing_actuals','negative_contribution',
  'inventory_discrepancy','stale_quarantine','failed_delivery','ai_drift','webhook_failure','permission_denial',
  'capacity_oversold','sla_at_risk',
];

export async function createAlert({
  tenantId,
  category,
  severity,
  title,
  description,
  entityType,
  entityId,
  client = supabaseAdmin,
}) {
  if (!ALERT_CATEGORIES.includes(category)) throw new Error('Unknown alert category');
  const { data, error } = await client.from('alerts').insert({
    tenant_id: tenantId,
    category,
    severity,
    title,
    description,
    entity_type: entityType,
    entity_id: entityId,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function acknowledgeAlert({ alertId, actorId, client = supabaseAdmin }) {
  const { data, error } = await client.from('alerts').update({
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: actorId,
  }).eq('id', alertId).select().single();
  if (error) throw error;
  return data;
}

export async function resolveAlert({ alertId, client = supabaseAdmin }) {
  const { data, error } = await client.from('alerts').update({
    resolved_at: new Date().toISOString(),
  }).eq('id', alertId).select().single();
  if (error) throw error;
  return data;
}

export async function getOpenAlerts({ tenantId, client = supabaseAdmin }) {
  const { data, error } = await client.from('alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createUnderMarginAlert({ routeId, contributionCents, thresholdCents, tenantId, client = supabaseAdmin }) {
  return createAlert({
    tenantId,
    category: 'under_margin',
    severity: 'warning',
    title: 'Route below margin floor',
    description: `Contribution ${contributionCents}c is below threshold ${thresholdCents}c`,
    entityType: 'route_plan',
    entityId: routeId,
    client,
  });
}

export async function createStaleQuarantineAlert({ itemId, days, tenantId, client = supabaseAdmin }) {
  return createAlert({
    tenantId,
    category: 'stale_quarantine',
    severity: 'warning',
    title: 'Item stuck in quarantine',
    description: `Item ${itemId} has been in quarantine for ${days} days`,
    entityType: 'donation_item',
    entityId: itemId,
    client,
  });
}

export async function createInventoryDiscrepancyAlert({ itemId, expected, actual, tenantId, client = supabaseAdmin }) {
  return createAlert({
    tenantId,
    category: 'inventory_discrepancy',
    severity: 'critical',
    title: 'Inventory cycle count discrepancy',
    description: `Expected ${expected}, actual ${actual}`,
    entityType: 'inventory_item',
    entityId: itemId,
    client,
  });
}
