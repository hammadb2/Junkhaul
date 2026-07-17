export function parseQuoPayload(payload = {}) {
  const eventType = payload.type || payload.eventType || payload.event_type || null;
  const eventId = payload.id || payload.eventId || payload.event_id || null;
  const msg = payload.data?.object || payload.data || payload.message || payload;
  const toValue = Array.isArray(msg.to) ? msg.to[0] : (msg.to || msg.toNumber || payload.to || null);
  const rawDirection = msg.direction || payload.direction || (eventType === 'message.received' ? 'inbound' : 'outbound');
  const direction = rawDirection === 'incoming' ? 'inbound' : rawDirection === 'outgoing' ? 'outbound' : rawDirection;
  return {
    provider_event_id: eventId,
    provider_event_type: eventType,
    provider_event_at: payload.createdAt || payload.created_at || msg.updatedAt || msg.createdAt || null,
    provider_id: msg.id || msg.messageId || payload.messageId || null,
    direction,
    from: msg.from || msg.fromNumber || payload.from || null,
    to: toValue,
    body: msg.body || msg.text || msg.content || payload.body || payload.text || '',
    provider_status: msg.status || payload.status || 'received',
    failure_code: msg.errorCode || msg.error_code || msg.error?.code || payload.errorCode || null,
    failure_reason: msg.errorMessage || msg.error_message || msg.error?.message || msg.error || payload.errorMessage || null,
    raw: payload,
  };
}

export function isQuoDeliveryEvent(parsed = {}) {
  return ['message.delivered', 'message.sent', 'message.failed', 'message.rejected', 'message.queued'].includes(parsed.provider_event_type)
    || ['queued', 'sent', 'delivered', 'failed', 'rejected'].includes(parsed.provider_status);
}
