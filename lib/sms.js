import { supabaseAdmin } from './supabase';
import { normalizePhone } from './phone';
import { recordTimelineEvent } from './timeline';

// ============================================================
// SMS via Quo API (https://www.quo.com/docs)
// Replaces Twilio. POST /v1/messages with { content, from, to[], userId }.
// Auth header is the raw API key (no "Bearer" prefix).
// ============================================================
const QUO_BASE = 'https://api.quo.com/v1';

export async function upsertSmsConsent({ phone, consent_source = null, consent_at = null, allowed_category = 'transactional' }) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return null;
  const { data, error } = await supabaseAdmin
    .from('sms_consent')
    .upsert({
      phone,
      normalized_phone,
      consent_source,
      consent_at: consent_at || new Date().toISOString(),
      current_eligibility: true,
      allowed_category,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'normalized_phone' })
    .select()
    .single();
  if (error) {
    console.error('sms consent upsert failed:', error.message);
    return null;
  }
  return data;
}

export async function setSmsSuppression(phone, reason, provider_payload = null) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return null;
  try {
    await supabaseAdmin.from('sms_consent').upsert({
      phone,
      normalized_phone,
      stop_at: new Date().toISOString(),
      current_eligibility: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'normalized_phone' });
  } catch {}
  const { data } = await supabaseAdmin.from('sms_suppression').upsert({
    normalized_phone,
    reason,
    suppressed_at: new Date().toISOString(),
    lifted_at: null,
    provider_payload,
  }, { onConflict: 'normalized_phone' }).select().single();
  return data || null;
}

export async function liftSmsSuppression(phone, provider_payload = null) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return null;
  try {
    await supabaseAdmin.from('sms_consent').upsert({
      phone,
      normalized_phone,
      start_at: new Date().toISOString(),
      current_eligibility: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'normalized_phone' });
  } catch {}
  const { data } = await supabaseAdmin.from('sms_suppression')
    .update({ lifted_at: new Date().toISOString(), provider_payload })
    .eq('normalized_phone', normalized_phone)
    .select()
    .maybeSingle();
  return data || null;
}

export async function canSendSMS(phone) {
  const normalized_phone = normalizePhone(phone);
  if (!normalized_phone) return { ok: false, reason: 'invalid_phone' };
  const { data: suppressed } = await supabaseAdmin
    .from('sms_suppression')
    .select('reason, lifted_at')
    .eq('normalized_phone', normalized_phone)
    .maybeSingle();
  if (suppressed && !suppressed.lifted_at) return { ok: false, reason: suppressed.reason || 'suppressed' };
  const { data: consent } = await supabaseAdmin
    .from('sms_consent')
    .select('current_eligibility')
    .eq('normalized_phone', normalized_phone)
    .maybeSingle();
  if (consent && consent.current_eligibility === false) return { ok: false, reason: 'not_eligible' };
  return { ok: true, normalized_phone };
}

async function linkMessageEntities(messageId, entities = {}) {
  const rows = [];
  const mapping = {
    booking_id: 'booking',
    lead_id: 'lead',
    donation_request_id: 'donation_request',
    campaign_id: 'campaign',
    service_request_id: 'service_request',
    refund_request_id: 'refund_request',
    nearby_offer_id: 'nearby_offer',
    employee_id: 'employee',
  };
  for (const [key, entity_type] of Object.entries(mapping)) {
    if (entities[key]) rows.push({ message_id: messageId, entity_type, entity_id: entities[key], link_reason: entities.link_reason || null });
  }
  if (rows.length) {
    try {
      await supabaseAdmin.from('message_entity_links').upsert(rows, { onConflict: 'message_id,entity_type,entity_id' });
    } catch {}
  }
}

function parseSendArgs(bookingOrOptions, message_type) {
  if (bookingOrOptions && typeof bookingOrOptions === 'object' && !Array.isArray(bookingOrOptions)) {
    return { ...bookingOrOptions, message_type: bookingOrOptions.message_type || message_type || null };
  }
  return { booking_id: bookingOrOptions || null, message_type: message_type || null };
}

export const sendSMS = async (to, body, bookingOrOptions = null, message_type = null) => {
  const options = parseSendArgs(bookingOrOptions, message_type);
  const normalizedTo = normalizePhone(to);
  const suppression = options.bypass_suppression ? { ok: true, normalized_phone: normalizedTo } : await canSendSMS(normalizedTo);
  if (!suppression.ok) {
    const blocked = {
      booking_id: options.booking_id || null,
      lead_id: options.lead_id || null,
      donation_request_id: options.donation_request_id || null,
      campaign_id: options.campaign_id || null,
      service_request_id: options.service_request_id || null,
      refund_request_id: options.refund_request_id || null,
      nearby_offer_id: options.nearby_offer_id || null,
      employee_id: options.employee_id || null,
      direction: 'outbound',
      to_number: normalizedTo || to,
      from_number: process.env.QUO_PHONE_NUMBER,
      message_type: options.message_type || null,
      body,
      provider_status: 'suppressed',
      failure_reason: suppression.reason,
      workflow_action: options.workflow_action || null,
      correlation_id: options.correlation_id || null,
    };
    const { data } = await supabaseAdmin.from('messages').insert(blocked).select().single();
    if (data?.id) await linkMessageEntities(data.id, blocked);
    throw new Error(`SMS suppressed: ${suppression.reason}`);
  }

  try {
    if (process.env.QUO_TEST_MODE === 'true') {
      const fake = {
        id: `quo_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        status: 'queued',
        test: true,
      };
      const row = {
        booking_id: options.booking_id || null,
        lead_id: options.lead_id || null,
        donation_request_id: options.donation_request_id || null,
        campaign_id: options.campaign_id || null,
        service_request_id: options.service_request_id || null,
        refund_request_id: options.refund_request_id || null,
        nearby_offer_id: options.nearby_offer_id || null,
        employee_id: options.employee_id || null,
        direction: 'outbound',
        to_number: normalizedTo || to,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: options.message_type || null,
        body,
        provider_sid: fake.id,
        provider_status: fake.status,
        provider_payload: fake,
        workflow_action: options.workflow_action || null,
        correlation_id: options.correlation_id || null,
      };
      const { data: inserted } = await supabaseAdmin.from('messages').insert(row).select().single();
      if (inserted?.id) await linkMessageEntities(inserted.id, row);
      return fake;
    }

    const res = await fetch(`${QUO_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: process.env.QUO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: body,
        from: process.env.QUO_PHONE_NUMBER,
        to: [normalizedTo || to],
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
    const row = {
      booking_id: options.booking_id || null,
      lead_id: options.lead_id || null,
      donation_request_id: options.donation_request_id || null,
      campaign_id: options.campaign_id || null,
      service_request_id: options.service_request_id || null,
      refund_request_id: options.refund_request_id || null,
      nearby_offer_id: options.nearby_offer_id || null,
      employee_id: options.employee_id || null,
      direction: 'outbound',
      to_number: normalizedTo || to,
      from_number: process.env.QUO_PHONE_NUMBER,
      message_type: options.message_type || null,
      body,
      provider_sid: msg.id || null,
      provider_status: msg.status || 'queued',
      provider_payload: msg,
      workflow_action: options.workflow_action || null,
      correlation_id: options.correlation_id || null,
    };
    const { data: inserted } = await supabaseAdmin.from('messages').insert(row).select().single();
    if (inserted?.id) {
      await linkMessageEntities(inserted.id, row);
      const entity_id = row.booking_id || row.lead_id || row.donation_request_id || row.service_request_id || row.refund_request_id || row.nearby_offer_id;
      const entity_type = row.booking_id ? 'booking' : row.lead_id ? 'lead' : row.donation_request_id ? 'donation_request' : row.service_request_id ? 'service_request' : row.refund_request_id ? 'refund_request' : row.nearby_offer_id ? 'nearby_offer' : null;
      if (entity_id && entity_type) {
        await recordTimelineEvent({
          entity_type,
          entity_id,
          event_type: 'quo_outbound',
          source: 'quo',
          metadata: { message_id: inserted.id, message_type: row.message_type, provider_status: row.provider_status },
          correlation_id: row.correlation_id,
        });
      }
    }

    return msg;
  } catch (error) {
    console.error('SMS send failed:', error);
    // Best-effort log of the failure so it's visible in the dashboard.
    try {
      const failed = {
        booking_id: options.booking_id || null,
        lead_id: options.lead_id || null,
        donation_request_id: options.donation_request_id || null,
        campaign_id: options.campaign_id || null,
        service_request_id: options.service_request_id || null,
        refund_request_id: options.refund_request_id || null,
        nearby_offer_id: options.nearby_offer_id || null,
        employee_id: options.employee_id || null,
        direction: 'outbound',
        to_number: normalizedTo || to,
        from_number: process.env.QUO_PHONE_NUMBER,
        message_type: options.message_type || null,
        body,
        provider_status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: error.message,
        workflow_action: options.workflow_action || null,
        correlation_id: options.correlation_id || null,
      };
      const { data } = await supabaseAdmin.from('messages').insert(failed).select().single();
      if (data?.id) await linkMessageEntities(data.id, failed);
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
