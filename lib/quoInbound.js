import { supabaseAdmin } from './supabase';
import { normalizePhone } from './phone';
import { setSmsSuppression, liftSmsSuppression, sendSMS } from './sms';
import { recordTimelineEvent } from './timeline';
export { classifyInboundText, responseMatchesExpected } from './quoRules';
import { classifyInboundText, responseMatchesExpected } from './quoRules';
import { isQuoDeliveryEvent, parseQuoPayload } from './quoPayload';
export { isQuoDeliveryEvent, parseQuoPayload } from './quoPayload';

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

export async function consumeExpectedReply(expectedReplyId, { consumedMessageId = null } = {}) {
  await supabaseAdmin.from('expected_replies').update({
    status: 'consumed',
    consumed_at: new Date().toISOString(),
    consumed_message_id: consumedMessageId,
  }).eq('id', expectedReplyId);
}

export async function resolveExpectedReply(phone, text) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return { status: 'none' };
  const now = new Date().toISOString();
  try {
    await supabaseAdmin
      .from('expected_replies')
      .update({ status: 'expired' })
      .eq('normalized_phone', normalized_phone)
      .eq('status', 'active')
      .lt('expires_at', now);
  } catch {}
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

export async function recordQuoWebhookEvent(parsed, { signatureTimestamp = null, status = 'received', rejectionReason = null } = {}) {
  if (!parsed.provider_event_id) return { duplicate: false, event: null };
  const row = {
    provider_event_id: parsed.provider_event_id,
    provider_event_type: parsed.provider_event_type,
    provider_message_id: parsed.provider_id,
    signature_timestamp: signatureTimestamp,
    status,
    rejection_reason: rejectionReason,
    raw_payload: parsed.raw,
  };
  const { data, error } = await supabaseAdmin
    .from('quo_webhook_events')
    .insert(row)
    .select()
    .single();
  if (error?.code === '23505') return { duplicate: true, event: null };
  if (error) throw error;
  return { duplicate: false, event: data };
}

export async function handleQuoDeliveryEvent(parsed, { signatureTimestamp = null } = {}) {
  const webhook = await recordQuoWebhookEvent(parsed, { signatureTimestamp, status: 'received' });
  if (webhook.duplicate) return { ok: true, duplicate: true, provider_event_id: parsed.provider_event_id };
  if (!parsed.provider_id) return { ok: false, error: 'missing_provider_message_id' };

  const updates = {
    provider_status: parsed.provider_status,
    provider_event_id: parsed.provider_event_id || null,
    provider_event_type: parsed.provider_event_type || null,
    provider_event_at: parsed.provider_event_at || new Date().toISOString(),
    provider_payload: parsed.raw,
  };
  if (parsed.provider_status === 'delivered') updates.delivered_at = parsed.provider_event_at || new Date().toISOString();
  if (['failed', 'rejected'].includes(parsed.provider_status)) {
    updates.failed_at = parsed.provider_event_at || new Date().toISOString();
    updates.failure_code = parsed.failure_code || null;
    updates.failure_reason = parsed.failure_reason || parsed.provider_status;
  }

  const { data: message } = await supabaseAdmin
    .from('messages')
    .update(updates)
    .eq('provider_sid', parsed.provider_id)
    .select()
    .maybeSingle();

  try {
    await supabaseAdmin
      .from('quo_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider_event_id', parsed.provider_event_id);
  } catch {}

  if (message?.booking_id || message?.lead_id || message?.donation_request_id) {
    const entity_type = message.booking_id ? 'booking' : message.lead_id ? 'lead' : 'donation_request';
    const entity_id = message.booking_id || message.lead_id || message.donation_request_id;
    await recordTimelineEvent({
      entity_type,
      entity_id,
      event_type: 'quo_delivery_event',
      actor_type: 'system',
      source: 'quo',
      metadata: {
        message_id: message.id,
        provider_sid: parsed.provider_id,
        provider_status: parsed.provider_status,
        provider_event_id: parsed.provider_event_id,
      },
    });
  }

  return { ok: true, routed: 'delivery_event', message_found: Boolean(message), provider_status: parsed.provider_status };
}

export async function handleCanonicalQuoInbound(payload, { signatureTimestamp = null } = {}) {
  const parsed = parseQuoPayload(payload);
  if (isQuoDeliveryEvent(parsed) && parsed.direction !== 'inbound' && parsed.provider_event_type !== 'message.received') {
    return handleQuoDeliveryEvent(parsed, { signatureTimestamp });
  }

  const normalized = normalizePhone(parsed.from);
  if (!normalized) return { ok: false, error: 'missing_from' };

  const webhook = await recordQuoWebhookEvent(parsed, { signatureTimestamp, status: 'received' });
  if (webhook.duplicate) return { ok: true, duplicate: true, provider_event_id: parsed.provider_event_id };

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
    provider_event_id: parsed.provider_event_id || null,
    provider_event_type: parsed.provider_event_type || null,
    provider_event_at: parsed.provider_event_at || null,
    provider_payload: parsed.raw,
  }).select().single();

  if (parsed.provider_event_id) {
    try {
      await supabaseAdmin
        .from('quo_webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider_event_id', parsed.provider_event_id);
    } catch {}
  }

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
