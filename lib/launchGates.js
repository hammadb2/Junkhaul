// ============================================================
// launchGates.js
//
// Staged launch gates with owner signatures and rollback plans.
// ============================================================

import { supabaseAdmin } from './supabase.js';

const DEFAULT_GATES = [
  { gate: 'quote_price_authority', owner_role: 'owner' },
  { gate: 'clean_ci_and_build', owner_role: 'owner' },
  { gate: 'permission_matrix_green', owner_role: 'security' },
  { gate: 'payment_webhook_inventory_concurrency', owner_role: 'finance' },
  { gate: 'route_reconciliation_margin_credible', owner_role: 'operations' },
  { gate: 'ai_underestimate_threshold_approved', owner_role: 'ai_quality' },
  { gate: 'crew_offline_test_real_devices', owner_role: 'operations' },
  { gate: 'clean_route_contamination_rehearsal', owner_role: 'operations' },
  { gate: 'backup_restore_rollback_rehearsal', owner_role: 'security' },
];

export async function ensureLaunchGates({ tenantId, client = supabaseAdmin }) {
  const { data: existing } = await client.from('launch_gates').select('gate').eq('tenant_id', tenantId);
  const existingGates = new Set((existing || []).map((g) => g.gate));
  const missing = DEFAULT_GATES.filter((g) => !existingGates.has(g.gate));
  if (missing.length) {
    const rows = missing.map((g) => ({ tenant_id: tenantId, ...g }));
    const { error } = await client.from('launch_gates').insert(rows);
    if (error) throw error;
  }
}

export async function signLaunchGate({ tenantId, gate, actorId, evidence, client = supabaseAdmin }) {
  const { data, error } = await client.from('launch_gates').update({
    passed: true,
    signed_by: actorId,
    signed_at: new Date().toISOString(),
    evidence,
  }).eq('tenant_id', tenantId).eq('gate', gate).select().single();
  if (error) throw error;
  return data;
}

export async function getLaunchGates({ tenantId, client = supabaseAdmin }) {
  await ensureLaunchGates({ tenantId, client });
  const { data, error } = await client.from('launch_gates').select('*').eq('tenant_id', tenantId).order('gate');
  if (error) throw error;
  return data || [];
}
