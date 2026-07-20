// ============================================================
// crewSync.js
//
// Server-side sync support for the crew app:
// - idempotency key lookup/insert,
// - offline action persistence and conflict detection,
// - session token lifecycle (issue, revoke, validate),
// - loaded item, truck inspection, fuel, odometer, barcode and rental return
//   helpers.
// ============================================================

import { createHash } from 'crypto';
import { supabaseAdmin } from './supabase.js';

export function hashIdempotencyKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

export async function checkIdempotency({ key, employeeId, actionType, payload, client = supabaseAdmin }) {
  const payloadHash = createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
  const { data: existing } = await client
    .from('crew_idempotency_keys')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    return { isDuplicate: true, response: existing.response, payloadHash: existing.payload_hash };
  }

  const { data, error } = await client
    .from('crew_idempotency_keys')
    .insert({ key, employee_id: employeeId, action_type: actionType, payload_hash: payloadHash, response: {} })
    .select()
    .single();
  if (error) throw error;
  return { isDuplicate: false, record: data, payloadHash };
}

export async function setIdempotencyResponse({ key, response, client = supabaseAdmin }) {
  const { error } = await client.from('crew_idempotency_keys').update({ response }).eq('key', key);
  if (error) throw error;
}

export async function recordOfflineAction({
  employeeId,
  idempotencyKey,
  actionType,
  payload,
  status = 'pending',
  client = supabaseAdmin,
}) {
  const { data, error } = await client.from('crew_offline_actions').insert({
    employee_id: employeeId,
    idempotency_key: idempotencyKey,
    action_type: actionType,
    payload,
    status,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateOfflineActionStatus({ actionId, status, serverResponse, lastError, attempts, client = supabaseAdmin }) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (serverResponse !== undefined) updates.server_response = serverResponse;
  if (lastError !== undefined) updates.last_error = lastError;
  if (typeof attempts === 'number') updates.attempts = attempts;
  const { data, error } = await client.from('crew_offline_actions').update(updates).eq('id', actionId).select().single();
  if (error) throw error;
  return data;
}

export async function recordSyncConflict({ employeeId, offlineActionId, actionType, clientVersion, serverVersion, payload, client = supabaseAdmin }) {
  const { data, error } = await client.from('crew_sync_conflicts').insert({
    employee_id: employeeId,
    offline_action_id: offlineActionId,
    action_type: actionType,
    client_version: clientVersion,
    server_version: serverVersion,
    payload,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function issueSessionToken({ employeeId, deviceId, scope = [], expiresInHours = 24, client = supabaseAdmin }) {
  const key = `${employeeId}:${deviceId || 'unknown'}:${Date.now()}:${Math.random()}`;
  const tokenHash = hashIdempotencyKey(key);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const { data, error } = await client.from('crew_session_tokens').insert({
    employee_id: employeeId,
    device_id: deviceId,
    token_hash: tokenHash,
    scope,
    expires_at: expiresAt.toISOString(),
  }).select().single();
  if (error) throw error;
  return { token: key, record: data };
}

export async function revokeSessionToken(token, client = supabaseAdmin) {
  const tokenHash = hashIdempotencyKey(token);
  const { data, error } = await client.from('crew_session_tokens').update({
    revoked_at: new Date().toISOString(),
  }).eq('token_hash', tokenHash).select().single();
  if (error) throw error;
  return data;
}

export async function validateSessionToken(token, requiredScope = null, client = supabaseAdmin) {
  const tokenHash = hashIdempotencyKey(token);
  const { data } = await client.from('crew_session_tokens').select('*, employees(*)').eq('token_hash', tokenHash).maybeSingle();
  if (!data) return { valid: false, reason: 'token_not_found' };
  if (data.revoked_at) return { valid: false, reason: 'token_revoked' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, reason: 'token_expired' };
  if (requiredScope && (!data.scope || !data.scope.includes(requiredScope))) return { valid: false, reason: 'scope_denied' };
  await client.from('crew_session_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { valid: true, employee: data.employees };
}

export async function recordLoadedItem(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('crew_loaded_items').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function recordTruckInspection(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('truck_inspections').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function recordFuelReceipt(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('fuel_receipts').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function recordOdometerReading(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('odometer_readings').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function recordBarcodeScan(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('barcode_scans').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function recordRentalReturn(payload, client = supabaseAdmin) {
  const { data, error } = await client.from('rental_returns').insert(payload).select().single();
  if (error) throw error;
  return data;
}
