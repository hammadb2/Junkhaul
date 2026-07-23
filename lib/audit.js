// ============================================================
// audit.js
//
// Immutable audit events for price, override, rate, route, payroll,
// inventory, inspection, refund exception and permissions.
// ============================================================

import { supabaseAdmin } from './supabase.js';

export async function recordAudit({
  tenantId,
  actorId,
  actorType = 'employee',
  action,
  entityType,
  entityId,
  payload = {},
  ip,
  userAgent,
  correlationId,
  client = supabaseAdmin,
}) {
  const sanitized = sanitizePayload(payload);
  const { data, error } = await client.from('audit_events').insert({
    tenant_id: tenantId,
    actor_id: actorId,
    actor_type: actorType,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload: sanitized,
    ip_address: ip || null,
    user_agent: userAgent || null,
    correlation_id: correlationId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

function sanitizePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload));
  const redact = ['password', 'secret', 'token', 'ssn', 'sin', 'credit_card', 'cvv'];
  for (const key of Object.keys(clone)) {
    if (redact.some((r) => key.toLowerCase().includes(r))) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}

export async function recordSecurityEvent({
  tenantId,
  actorId,
  eventType,
  severity,
  description,
  ip,
  userAgent,
  payload = {},
  correlationId,
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('security_events').insert({
    tenant_id: tenantId,
    actor_id: actorId,
    event_type: eventType,
    severity,
    description,
    ip_address: ip || null,
    user_agent: userAgent || null,
    payload: sanitizePayload(payload),
    correlation_id: correlationId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function queryAudit({ entityType, entityId, limit = 50, client = supabaseAdmin }) {
  let q = client.from('audit_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (entityType) q = q.eq('entity_type', entityType);
  if (entityId) q = q.eq('entity_id', entityId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

const KILL_SWITCH_MAP = {
  abandonment_followup: 'kill_switch_abandonment_followup',
  opportunistic_live: 'kill_switch_opportunistic_live',
  opportunistic_proactive: 'kill_switch_opportunistic_proactive',
  review_request: 'kill_switch_review_request',
  demand_snapshot: 'kill_switch_demand_snapshot',
  surge_pricing: 'kill_switch_surge_pricing',
  no_show_check: 'kill_switch_no_show_check',
  waitlist_expiry: 'kill_switch_waitlist_expiry',
  slot_fill_alert: 'kill_switch_slot_fill_alert',
  day_before_fill: 'kill_switch_day_before_fill',
  morning_reminders: 'kill_switch_morning_reminders',
  day_summary: 'kill_switch_day_summary',
  generate_slots: 'kill_switch_generate_slots',
  confirmation_sweep: 'kill_switch_confirmation_sweep',
};

export async function isKillSwitchOn(feature, client = supabaseAdmin) {
  const key = KILL_SWITCH_MAP[feature];
  if (!key) throw new Error(`Unknown kill switch feature ${feature}`);
  const { data, error } = await client.from('system_config').select('value').eq('key', key).single();
  if (error || !data) return true;
  return data.value !== 'false';
}

async function upsertCronHealth({ jobName, status, payload, client }) {
  const now = new Date().toISOString();
  const { error } = await client.from('cron_health').upsert({
    job_name: jobName,
    last_run_at: now,
    last_status: status,
    last_payload: sanitizePayload(payload || {}),
    updated_at: now,
  }, { onConflict: 'job_name' });
  if (error) throw error;
}

export async function cronStarted(jobName, client = supabaseAdmin) {
  await upsertCronHealth({ jobName, status: 'started', client });
}

export async function cronFinished(jobName, payload, client = supabaseAdmin) {
  await upsertCronHealth({ jobName, status: 'ok', payload, client });
}

export async function cronFailed(jobName, error, client = supabaseAdmin) {
  await upsertCronHealth({
    jobName,
    status: 'failed',
    payload: { message: error?.message || String(error) },
    client,
  });
}

export async function logEvent({ event_type, lead_id, customer_phone, payload = {}, client = supabaseAdmin }) {
  await recordAudit({
    action: event_type,
    entityType: 'lead',
    entityId: lead_id,
    payload: {
      customer_phone,
      ...payload,
    },
    client,
  });
}
