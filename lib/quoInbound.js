import { supabaseAdmin } from './supabase';
import { normalizePhone } from './phone';
import { setSmsSuppression, liftSmsSuppression, sendSMS } from './sms';
import { recordTimelineEvent } from './timeline';
export { classifyInboundText, responseMatchesExpected } from './quoRules';
import { classifyInboundText, responseMatchesExpected } from './quoRules';

export async function createExpectedReply({
  phone,
  entity_type,
  entity_id,
  expected_intent,
  valid_responses = ['YES', 'NO'],
  expires_at,
  metadata = {},
}) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) throw new Error('phone required');
  const { data, error } = await supabaseAdmin
    .from('expected_replies')
    .insert({
      phone,
      normalized_phone,
      entity_type,
      entity_id,
      expected_intent,
      valid_responses,
      expires_at,
      metadata,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveExpectedReply(phone, text) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return { status: 'none' };
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('expected_replies')
    .update({ status: 'expired' })
    .eq('normalized_phone', normalized_phone)
    .eq('status', 'active')
    .lt('expires_at', now)
    .catch(() => {});
  const { data } = await supabaseAdmin
    .from('expected_replies')
    .select('*')
    .eq('normalized_phone', normalized_phone)
    .eq('status', 'active')
    .gte('expires_at', now)
    .order('created_at', { ascending: false });
  const matches = (data || []).filter((e) => responseMatchesExpected(text, e));
  if (matches.length === 1) return { status: 'matched', expected: matches[0] };
  if (matches.length > 1) return { status: 'ambiguous', matches };
  return { status: data?.length ? 'no_match' : 'none', active: data || [] };
}

export function parseQuoPayload(payload = {}) {
  const msg = payload.data || payload.message || payload;
  return {
    provider_id: msg.id || msg.messageId || payload.id || null,
    direction: msg.direction || payload.direction || 'inbound',
    from: msg.from || msg.fromNumber || payload.from || null,
    to: msg.to || msg.toNumber || payload.to || null,
    body: msg.body || msg.content || payload.body || payload.text || '',
    provider_status: msg.status || payload.status || 'received',
    raw: payload,
  };
}

export async function handleCanonicalQuoInbound(payload, { verify = true } = {}) {
  const parsed = parseQuoPayload(payload);
  const normalized = normalizePhone(parsed.from);
  if (!normalized) return { ok: false, error: 'missing_from' };

  if (parsed.provider_id) {
    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('provider_sid', parsed.provider_id)
      .maybeSingle();
    if (existing) return { ok: true, duplicate: true, message_id: existing.id };
  }

  const { data: message } = await supabaseAdmin.from('messages').insert({
    direction: 'inbound',
    from_number: normalized,
    to_number: parsed.to,
    body: parsed.body,
    provider_sid: parsed.provider_id,
    provider_status: parsed.provider_status,
    provider_payload: parsed.raw,
  }).select().single();

  const intent = classifyInboundText(parsed.body);
  if (intent === 'STOP') {
    await setSmsSuppression(normalized, 'customer_stop', parsed.raw);
    await sendSMS(normalized, 'You are unsubscribed from Junk Haul Calgary texts. Reply START to resubscribe.', {
      message_type: 'optout',
      workflow_action: 'sms_stop',
      bypass_suppression: true,
    });
    return { ok: true, intent, message_id: message?.id };
  }
  if (intent === 'START') {
    await liftSmsSuppression(normalized, parsed.raw);
    await sendSMS(normalized, 'You are resubscribed to Junk Haul Calgary texts. Reply STOP to opt out.', { message_type: 'start_confirmation', workflow_action: 'sms_start', bypass_suppression: true });
    return { ok: true, intent, message_id: message?.id };
  }
  if (intent === 'HELP') {
    await sendSMS(normalized, 'Junk Haul Calgary: book at junkhaul.ca/book or call (587) 325-0751. Reply STOP to opt out.', { message_type: 'help', workflow_action: 'sms_help', bypass_suppression: true });
    return { ok: true, intent, message_id: message?.id };
  }

  const expected = await resolveExpectedReply(normalized, parsed.body);
  if (intent === 'AFFIRMATIVE' && expected.status !== 'matched') {
    return { ok: true, intent, routed: 'ambiguous_or_unexpected', expected_status: expected.status, message_id: message?.id };
  }
  if (expected.status === 'matched') {
    await supabaseAdmin.from('expected_replies').update({
      status: 'consumed',
      consumed_at: new Date().toISOString(),
      consumed_message_id: message?.id || null,
    }).eq('id', expected.expected.id);
    await recordTimelineEvent({
      entity_type: expected.expected.entity_type,
      entity_id: expected.expected.entity_id,
      event_type: 'quo_expected_reply_consumed',
      actor_type: 'customer',
      source: 'quo',
      metadata: { expected_intent: expected.expected.expected_intent, body: parsed.body, message_id: message?.id },
    });
    return { ok: true, intent, routed: 'expected_reply', expected: expected.expected, message_id: message?.id };
  }
  return { ok: true, intent, routed: 'customer_service', message_id: message?.id };
}
