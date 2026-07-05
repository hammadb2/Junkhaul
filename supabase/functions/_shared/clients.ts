import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Send an SMS via Quo and log it to the messages table.
export const sendSMS = async (
  to: string,
  body: string,
  booking_id: string | null = null,
  message_type: string | null = null,
) => {
  const res = await fetch('https://api.quo.com/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: Deno.env.get('QUO_API_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: body,
      from: Deno.env.get('QUO_PHONE_NUMBER'),
      to: [to],
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
    to_number: to,
    from_number: Deno.env.get('QUO_PHONE_NUMBER'),
    message_type,
    body,
    provider_sid: msg.id || null,
    provider_status: res.ok ? msg.status || 'queued' : 'failed',
  });

  return msg;
};
