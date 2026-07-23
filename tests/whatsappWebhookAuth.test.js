import assert from 'node:assert/strict';
import { signWhatsAppWebhookBody, verifyWhatsAppWebhookSignature } from '../lib/whatsappWebhookAuth.js';

// ============================================================
// WhatsApp/Meta inbound webhook signature verification (audit C3).
// Before this, POST /api/whatsapp-webhook had no payload signature check
// at all -- anyone who learned the URL could forge inbound WhatsApp
// messages and drive the AI booking flow.
// ============================================================

const appSecret = 'test_meta_app_secret';
const rawBody = JSON.stringify({ entry: [{ changes: [{ value: { messaging_product: 'whatsapp' } }] }] });

const validSignature = signWhatsAppWebhookBody({ rawBody, appSecret });

// --- A correctly-signed payload is accepted ---
assert.equal(verifyWhatsAppWebhookSignature({ rawBody, appSecret, signatureHeader: validSignature }).ok, true);

// --- A tampered signature is rejected ---
assert.equal(verifyWhatsAppWebhookSignature({ rawBody, appSecret, signatureHeader: validSignature.replace(/.$/, 'f') }).ok, false);

// --- A different body under the same signature is rejected (proves the
//     signature is actually bound to the payload, not just present) ---
assert.equal(verifyWhatsAppWebhookSignature({ rawBody: rawBody + 'tampered', appSecret, signatureHeader: validSignature }).ok, false);

// --- Missing signature / missing secret fail closed with a clear reason ---
assert.equal(verifyWhatsAppWebhookSignature({ rawBody, appSecret, signatureHeader: null }).reason, 'missing_signature');
assert.equal(verifyWhatsAppWebhookSignature({ rawBody, appSecret: null, signatureHeader: validSignature }).reason, 'missing_app_secret');

// --- Wrong scheme prefix (not sha256=) is rejected, not silently accepted ---
assert.equal(verifyWhatsAppWebhookSignature({ rawBody, appSecret, signatureHeader: `sha1=${validSignature.split('=')[1]}` }).reason, 'invalid_signature_format');

console.log('whatsappWebhookAuth tests passed');
