import crypto from 'crypto';

// ============================================================
// Meta/WhatsApp webhook payload signature verification (audit C3).
//
// The inbound WhatsApp webhook (app/api/whatsapp-webhook/route.js) had a
// GET verify-token check (guards the one-time subscription handshake) but
// no signature check at all on the POST body -- anyone who learned the
// webhook URL could POST a forged inbound message and drive the AI /
// booking flow. Meta signs every webhook delivery with
// X-Hub-Signature-256: sha256=<hex HMAC-SHA256 of the raw body, keyed by
// the Meta App Secret> -- see
// https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
// ============================================================

export const WHATSAPP_SIGNATURE_HEADER = 'x-hub-signature-256';

function safeCompareHex(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

export function signWhatsAppWebhookBody({ rawBody, appSecret }) {
  const digest = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  return `sha256=${digest}`;
}

export function verifyWhatsAppWebhookSignature({ rawBody, signatureHeader, appSecret }) {
  if (!appSecret) return { ok: false, reason: 'missing_app_secret' };
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' };
  const [scheme, providedHex] = String(signatureHeader).split('=');
  if (scheme !== 'sha256' || !providedHex) return { ok: false, reason: 'invalid_signature_format' };
  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  if (safeCompareHex(providedHex, expectedHex)) return { ok: true };
  return { ok: false, reason: 'invalid_signature' };
}
