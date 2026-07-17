import { supabaseAdmin } from './supabase.js';

export async function recordAuditEvent({
  entity_type,
  entity_id = null,
  event_type,
  actor_type = 'system',
  actor_id = null,
  source = null,
  before = null,
  after = null,
  reason = null,
  metadata = {},
  correlation_id = null,
}) {
  if (!entity_type || !event_type) return null;
  const { data, error } = await supabaseAdmin
    .from('audit_events')
    .insert({
      entity_type,
      entity_id,
      event_type,
      actor_type,
      actor_id,
      source,
      before_state: before,
      after_state: after,
      reason,
      metadata,
      correlation_id,
    })
    .select()
    .single();
  if (error) {
    console.error('recordAuditEvent failed:', error.message);
    return null;
  }
  return data;
}
