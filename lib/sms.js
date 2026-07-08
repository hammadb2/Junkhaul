import { supabaseAdmin } from './supabase';

// ============================================================
// SMS via Quo API (https://www.quo.com/docs)
// Replaces Twilio. POST /v1/messages with { content, from, to[], userId }.
// Auth header is the raw API key (no "Bearer" prefix).
// ============================================================
const QUO_BASE = 'https://api.quo.com/v1';

export const sendSMS = async (to, body, booking_id = null, message_type = null) => {
  try {
    const res = await fetch(`${QUO_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: process.env.QUO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: body,
        from: process.env.QUO_PHONE_NUMBER,
        to: [to],
        userId: process.env.QUO_USER_ID,
      }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(
        `Quo send failed (${res.status}): ${JSON.stringify(data)}`
      );
    }

    const msg = data?.data || data || {};

    // Log in messages table
    await supabaseAdmin.from('messages').insert({
      booking_id,
      direction: 'outbound',
      to_number: to,
      from_number: process.env.QUO_PHONE_NUMBER,
      message_type,
      body,
      provider_sid: msg.id || null,
      provider_status: msg.status || 'queued',
    });

    return msg;
  } catch (error) {
    console.error('SMS send failed:', error);
    // Best-effort log of the failure so it's visible in the dashboard.
    try {
      await supabaseAdmin.from('messages').insert({
        booking_id,
        direction: 'outbound',
        to_number: to,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type,
        body,
        provider_status: 'failed',
      });
    } catch {
      /* ignore secondary logging errors */
    }
    throw error;
  }
};

// Convenience: alert the operator(s) about a payroll/portal event.
export const alertOperator = async (body) => {
  const phones = [process.env.HAMMAD_PHONE, process.env.BROTHER_PHONE].filter(Boolean);
  for (const p of phones) {
    try { await sendSMS(p, body, null, 'operator_alert'); } catch { /* best-effort */ }
  }
};
