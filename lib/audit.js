// ============================================================
// AUDIT LOGGING — one-row-per-event immutable log.
//
// Every automated decision (price surge, discount offer, SMS send,
// cron run) should write a single event to system_events.
//
// Usage:
//   await logEvent({ event_type: 'surge_applied', booking_id, payload: {...} });
//   await cronStarted('abandonment-followup');
//   await cronFinished('abandonment-followup', { sent: 12 });
// ============================================================

import { supabaseAdmin } from './supabase';

export const logEvent = async ({ event_type, booking_id = null, lead_id = null, customer_phone = null, payload = {} }) => {
  try {
    await supabaseAdmin.from('system_events').insert({
      event_type,
      booking_id,
      lead_id,
      customer_phone,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('logEvent failed:', err);
  }
};

const upsertCronHealth = async (job_name, status, payload) => {
  try {
    const now = new Date().toISOString();
    await supabaseAdmin.from('cron_health').upsert({
      job_name,
      last_run_at: now,
      last_status: status,
      last_payload: payload,
      updated_at: now,
    }, { onConflict: 'job_name' });
  } catch (err) {
    console.error('cronHealth upsert failed:', err);
  }
};

export const cronStarted = (job_name) => upsertCronHealth(job_name, 'started', {});
export const cronFinished = (job_name, payload = {}) => upsertCronHealth(job_name, 'finished', payload);
export const cronFailed = (job_name, error) => upsertCronHealth(job_name, 'failed', { error: error?.message || String(error) });

// ============================================================
// KILL SWITCHES — one boolean per automated system.
//
// The config key pattern is kill_switch_{name}. If the switch is
// off, the caller should exit cleanly.
// ============================================================
import { getBooleanConfig } from './config';

export const isKillSwitchOn = async (name, fallback = true) => {
  return getBooleanConfig(`kill_switch_${name}`, fallback);
};
