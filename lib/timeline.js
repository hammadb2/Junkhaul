import { supabaseAdmin } from './supabase';

export async function recordTimelineEvent({
  entity_type,
  entity_id,
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
  if (!entity_type || !entity_id || !event_type) return null;
  const row = {
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
  };
  const { data, error } = await supabaseAdmin.from('timeline_events').insert(row).select().single();
  if (error) {
    console.error('recordTimelineEvent failed:', error.message);
    return null;
  }
  return data;
}
