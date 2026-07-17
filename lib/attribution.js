import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase';
import { recordTimelineEvent } from './timeline';

export const ATTRIBUTION_COOKIE = 'jh_attribution_session';

export function attributionSessionId() {
  return crypto.randomUUID();
}

export async function resolveCampaignCode(code) {
  if (!code) return null;
  const { data } = await supabaseAdmin
    .from('campaign_tracking_codes')
    .select('*, campaign:marketing_campaigns(*), batch:campaign_batches(*)')
    .eq('code', String(code).trim())
    .eq('active', true)
    .maybeSingle();
  return data || null;
}

function recordFromInput(input = {}, resolved = null) {
  const campaign = resolved?.campaign || null;
  const batch = resolved?.batch || null;
  return {
    channel: input.channel || campaign?.channel || null,
    source: input.source || campaign?.source || null,
    campaign_id: campaign?.id || input.campaign_id || null,
    batch_id: batch?.id || input.batch_id || null,
    creative: input.creative || batch?.creative || null,
    neighbourhood: input.neighbourhood || batch?.neighbourhood || null,
    distribution_zone: input.distribution_zone || batch?.distribution_zone || null,
    distributor: input.distributor || batch?.distributor || null,
    distribution_date: input.distribution_date || batch?.distribution_date || null,
    tracking_code_id: resolved?.id || null,
    tracking_code: input.tracking_code || resolved?.code || null,
    qr_code: input.qr_code || resolved?.qr_code || null,
    promotion: input.promotion || campaign?.offer || null,
    landing_path: input.landing_path || null,
    referrer: input.referrer || null,
    utm_source: input.utm_source || null,
    utm_medium: input.utm_medium || null,
    utm_campaign: input.utm_campaign || null,
    utm_content: input.utm_content || null,
    utm_term: input.utm_term || null,
    gclid: input.gclid || null,
    fbclid: input.fbclid || null,
    customer_reported_source: input.customer_reported_source || null,
    attribution_reason: input.attribution_reason || (resolved ? 'tracking_code_resolved' : 'captured_from_request'),
  };
}

export async function captureAttribution({
  session_id,
  lead_id = null,
  booking_id = null,
  donation_request_id = null,
  customer_id = null,
  touch = {},
}) {
  if (!session_id) return null;
  const resolved = await resolveCampaignCode(touch.tracking_code || touch.code);
  const base = recordFromInput(touch, resolved);
  const now = new Date().toISOString();

  let first = null;
  const { data: existingFirst } = await supabaseAdmin
    .from('attribution_records')
    .select('*')
    .eq('session_id', session_id)
    .eq('touch_type', 'first')
    .maybeSingle();

  if (!existingFirst) {
    const { data } = await supabaseAdmin
      .from('attribution_records')
      .insert({
        ...base,
        session_id,
        lead_id,
        booking_id,
        donation_request_id,
        customer_id,
        touch_type: 'first',
        first_visit_at: now,
        last_visit_at: now,
      })
      .select()
      .single();
    first = data || null;
  } else {
    first = existingFirst;
  }

  const { data: last } = await supabaseAdmin
    .from('attribution_records')
    .insert({
      ...base,
      session_id,
      lead_id,
      booking_id,
      donation_request_id,
      customer_id,
      touch_type: 'last',
      first_visit_at: first?.first_visit_at || now,
      last_visit_at: now,
    })
    .select()
    .single();

  const patch = {
    attribution_record_id: last?.id || first?.id || null,
    first_touch_attribution_id: first?.id || null,
    last_touch_attribution_id: last?.id || null,
  };
  if (lead_id) {
    try { await supabaseAdmin.from('leads').update(patch).eq('id', lead_id); } catch {}
  }
  if (booking_id) {
    try { await supabaseAdmin.from('bookings').update(patch).eq('id', booking_id); } catch {}
  }
  if (donation_request_id) {
    try { await supabaseAdmin.from('donation_requests').update(patch).eq('id', donation_request_id); } catch {}
  }

  const entity_id = booking_id || donation_request_id || lead_id;
  const entity_type = booking_id ? 'booking' : donation_request_id ? 'donation_request' : lead_id ? 'lead' : null;
  if (entity_id) {
    await recordTimelineEvent({
      entity_type,
      entity_id,
      event_type: 'attribution_captured',
      source: 'attribution',
      metadata: { first_touch_id: first?.id, last_touch_id: last?.id, ...base },
    });
  }

  return { first, last, resolved };
}

export async function getOrCreateAttributionCookie(overrides = {}) {
  const store = await cookies();
  const existing = store.get(ATTRIBUTION_COOKIE)?.value;
  const sessionId = existing || attributionSessionId();
  if (!existing) {
    store.set(ATTRIBUTION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  await captureAttribution({ session_id: sessionId, touch: overrides });
  return sessionId;
}
