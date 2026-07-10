import { supabaseAdmin } from './supabase';

// ============================================================
// WhatsApp Business API (Meta Cloud Platform)
//
// Sends and receives WhatsApp messages using Meta's official API.
// Uses the same "Casey" AI personality as SMS.
//
// Env vars:
//   WHATSAPP_TOKEN — Meta WhatsApp Business API token
//   WHATSAPP_PHONE_NUMBER_ID — Phone number ID from Meta Business
//   WHATSAPP_VERIFY_TOKEN — Webhook verification token (any string)
// ============================================================

const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

export const sendWhatsApp = async (to, body, booking_id = null, message_type = null) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn('WhatsApp env vars not set — skipping send');
    return null;
  }

  try {
    // Normalize phone (remove +, spaces, dashes — WhatsApp wants digits with country code)
    const cleanTo = to.replace(/[^\d]/g, '');

    const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: { body: body.slice(0, 4096) }, // WhatsApp limit
      }),
    });

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      throw new Error(`WhatsApp send failed (${res.status}): ${JSON.stringify(data)}`);
    }

    // Log in messages table
    const msgId = data?.messages?.[0]?.id || null;
    await supabaseAdmin.from('messages').insert({
      booking_id,
      direction: 'outbound',
      to_number: to,
      from_number: 'whatsapp',
      message_type: message_type || 'whatsapp_outbound',
      body,
      provider_sid: msgId,
      provider_status: 'sent',
    });

    return data;
  } catch (error) {
    console.error('WhatsApp send failed:', error.message);
    // Best-effort log
    try {
      await supabaseAdmin.from('messages').insert({
        booking_id,
        direction: 'outbound',
        to_number: to,
        from_number: 'whatsapp',
        message_type: message_type || 'whatsapp_outbound',
        body,
        provider_status: 'failed',
      });
    } catch { /* ignore */ }
    throw error;
  }
};

// Download WhatsApp media (photos) by media ID
export async function downloadWhatsAppMedia(mediaId) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !mediaId) return null;

  try {
    // Step 1: Get the media URL
    const metaRes = await fetch(`${WHATSAPP_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const url = meta.url;
    if (!url) return null;

    // Step 2: Download the actual media
    const mediaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!mediaRes.ok) return null;
    const buffer = await mediaRes.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (e) {
    console.error('WhatsApp media download failed:', e.message);
    return null;
  }
}
