import crypto from 'crypto';

export const QUO_SIGNATURE_HEADER = 'openphone-signature';
export const DEFAULT_QUO_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export function signQuoWebhookBody({ rawBody, signingSecret, timestamp = Date.now() }) {
  const key = Buffer.from(signingSecret, 'base64');
  const digest = crypto
    .createHmac('sha256', key)
    .update(Buffer.from(`${timestamp}.${rawBody}`, 'utf8'))
    .digest('base64');
  return `hmac;1;${timestamp};${digest}`;
}

function safeCompareBase64(a, b) {
  const left = Buffer.from(String(a || ''), 'base64');
  const right = Buffer.from(String(b || ''), 'base64');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyQuoWebhookSignature({
  rawBody,
  signatureHeader,
  signingSecret,
  now = Date.now(),
  toleranceMs = DEFAULT_QUO_SIGNATURE_TOLERANCE_MS,
}) {
  if (!signingSecret) return { ok: false, reason: 'missing_signing_secret' };
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' };
  const candidates = String(signatureHeader).split(',').map((part) => part.trim()).filter(Boolean);
  for (const candidate of candidates) {
    const [scheme, version, timestampText, providedDigest] = candidate.split(';');
    if (scheme !== 'hmac' || version !== '1' || !timestampText || !providedDigest) continue;
    const timestamp = Number(timestampText);
    if (!Number.isFinite(timestamp)) return { ok: false, reason: 'invalid_timestamp' };
    if (Math.abs(now - timestamp) > toleranceMs) return { ok: false, reason: 'expired_signature', timestamp };
    const expectedHeader = signQuoWebhookBody({ rawBody, signingSecret, timestamp });
    const expectedDigest = expectedHeader.split(';')[3];
    if (safeCompareBase64(providedDigest, expectedDigest)) return { ok: true, timestamp };
  }
  return { ok: false, reason: 'invalid_signature' };
}
