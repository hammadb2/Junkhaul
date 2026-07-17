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
