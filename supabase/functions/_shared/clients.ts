import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Check if a kill switch is enabled. Defaults to true if missing.
export const isKillSwitchOn = async (name: string) => {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', `kill_switch_${name}`)
    .single();

  if (!data) return true;
  return data.value === 'true' || data.value === '1';
};

const normalizePhone = (phone: string | null | undefined) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(phone).startsWith('+')) return String(phone);
  return null;
};

export const canSendSMS = async (to: string) => {
  const normalized = normalizePhone(to);
  if (!normalized) return { ok: false, normalized, reason: 'invalid_phone' };

  const { data: suppressed } = await supabase
    .from('sms_suppression')
    .select('reason, lifted_at')
    .eq('normalized_phone', normalized)
    .maybeSingle();

  if (suppressed && !suppressed.lifted_at) {
    return { ok: false, normalized, reason: suppressed.reason || 'suppressed' };
  }

  const { data: consent } = await supabase
    .from('sms_consent')
    .select('current_eligibility')
    .eq('normalized_phone', normalized)
    .maybeSingle();

  if (consent && consent.current_eligibility === false) {
    return { ok: false, normalized, reason: 'not_eligible' };
  }

  return { ok: true, normalized, reason: null };
};

// Send an SMS via Quo and log it to the messages table.
export const sendSMS = async (
  to: string,
  body: string,
  booking_id: string | null = null,
  message_type: string | null = null,
) => {
  const suppression = await canSendSMS(to);
  if (!suppression.ok) {
    await supabase.from('messages').insert({
      booking_id,
      direction: 'outbound',
      to_number: suppression.normalized || to,
      from_number: Deno.env.get('QUO_PHONE_NUMBER'),
      message_type,
      body,
      provider_status: 'suppressed',
      failure_reason: suppression.reason,
    });
    throw new Error(`SMS suppressed: ${suppression.reason}`);
  }

  const res = await fetch('https://api.quo.com/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: Deno.env.get('QUO_API_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: body,
      from: Deno.env.get('QUO_PHONE_NUMBER'),
      to: [suppression.normalized || to],
      userId: Deno.env.get('QUO_USER_ID'),
    }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  const msg = data?.data || data || {};

  await supabase.from('messages').insert({
    booking_id,
    direction: 'outbound',
    to_number: suppression.normalized || to,
    from_number: Deno.env.get('QUO_PHONE_NUMBER'),
    message_type,
    body,
    provider_sid: msg.id || null,
    provider_status: res.ok ? msg.status || 'queued' : 'failed',
  });

  return msg;
};
