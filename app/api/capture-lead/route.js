import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS, upsertSmsConsent } from '@/lib/sms';
import { geocodeAddress } from '@/lib/geocode';
import { normalizePhone } from '@/lib/phone';
import { captureAttribution } from '@/lib/attribution';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

export async function POST(req) {
  const { phone, session_id, action, ...rest } = await req.json();
  // session_id is always required; phone may be 'pending' for the
  // price_first variant where the lead row is created before the phone is
  // captured (address step). All DB writes key off session_id, so a pending
  // phone is fine — SMS sending is guarded internally on hasRealPhone.
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  const hasRealPhone = phone && phone !== 'pending';
  const normalizedPhone = hasRealPhone ? normalizePhone(phone) : null;

  if (action === 'init') {
    // For the price_first variant, 'init' may be called with phone='pending'
    // (at the address step) to create the lead row before the phone is known.
    // In that case we skip the welcome SMS — it's sent later when the real
    // phone is captured (a second 'init' upserts by session_id).
    const leadRow = {
      phone: normalizedPhone || phone,
      normalized_phone: normalizedPhone,
      session_id,
      booking_session_id: session_id,
      source: rest.source || 'web',
      // UTM / click-ID capture at first touch (Step 2)
      utm_source: rest.utm_source || null,
      utm_medium: rest.utm_medium || null,
      utm_campaign: rest.utm_campaign || null,
      gclid: rest.gclid || null,
      fbclid: rest.fbclid || null,
      sms_consent_source: rest.sms_consent_source || 'booking_phone_gate',
      sms_consent_at: hasRealPhone ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    // price_first: the address may already be known at init time, so attach
    // it. `leads` has no address_data column — writing that object directly
    // (as this used to) makes Postgres reject the whole upsert, silently
    // dropping the address too. Pull lat/lng out of it instead, matching
    // the 'update' action's handling below.
    if (rest.address) leadRow.address = rest.address;
    if (rest.address_data?.lat && rest.address_data?.lng) {
      leadRow.lat = rest.address_data.lat;
      leadRow.lng = rest.address_data.lng;
    }
    if (rest.ab_variant) {
      leadRow.ab_variant = rest.ab_variant;
      leadRow.ab_variant_assigned_at = new Date().toISOString();
    }
    let returningLead = null;
    if (normalizedPhone) {
      const { data: existingByPhone } = await supabaseAdmin
        .from('leads')
        .select('id, session_id, converted_to_booking_id')
        .eq('normalized_phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      returningLead = existingByPhone || null;
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(leadRow, { onConflict: 'session_id' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const attr = await captureAttribution({
      session_id,
      lead_id: data.id,
      touch: {
        source: rest.source || 'web',
        channel: rest.channel || null,
        landing_path: rest.landing_path || '/book',
        referrer: rest.referrer || null,
        code: rest.code || rest.tracking_code || null,
        tracking_code: rest.tracking_code || rest.code || null,
        utm_source: rest.utm_source || null,
        utm_medium: rest.utm_medium || null,
        utm_campaign: rest.utm_campaign || null,
        utm_content: rest.utm_content || null,
        utm_term: rest.utm_term || null,
        gclid: rest.gclid || null,
        fbclid: rest.fbclid || null,
      },
    });

    if (hasRealPhone) {
      await upsertSmsConsent({
        phone: normalizedPhone,
        consent_source: rest.sms_consent_source || 'booking_phone_gate',
        consent_at: new Date().toISOString(),
      });
      // An SMS delivery failure (suppression, provider outage, out-of-credit,
      // etc.) must never block the customer from proceeding past this step —
      // matches the fire-and-forget pattern used for the out_of_area SMS below.
      try {
        await sendSMS(
          normalizedPhone,
          `Junk Haul Calgary here! Upload your photos and we'll get you an instant price. Questions? Call or text (587) 325-0751`,
          {
            lead_id: data.id,
            campaign_id: attr?.last?.campaign_id || null,
            message_type: 'lead_welcome',
            workflow_action: 'booking_phone_capture',
          }
        );
      } catch (e) {
        console.error('lead_welcome SMS failed:', e.message);
      }
    }
    await recordTimelineEvent({
      entity_type: 'lead',
      entity_id: data.id,
      event_type: 'lead_created_or_returned',
      source: 'booking_flow',
      metadata: { session_id, returning_lead_id: returningLead?.id || null, ab_variant: rest.ab_variant || null },
    });
    return NextResponse.json({ ok: true, lead_id: data.id, returning_lead: Boolean(returningLead) });
  }

  if (action === 'update') {
    // Whitelist to real `leads` columns only. This used to be `{ ...rest }`
    // (every field the caller sent, blind), which silently broke the ENTIRE
    // update whenever the caller included a field the table doesn't have —
    // confirmed live: AddressStep sends `address_data` (a Mapbox object) on
    // every address selection, but `leads` has no address_data column, so
    // Postgres rejected the whole statement and the customer's `address`
    // (which WAS a valid column) never got saved either. Nothing surfaced
    // this because the result wasn't checked and the client call is
    // fire-and-forget.
    const ALLOWED_FIELDS = ['address', 'ab_variant', 'current_step', 'name', 'email'];
    const updateData = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED_FIELDS) {
      if (rest[key] !== undefined) updateData[key] = rest[key];
    }

    // Geocode address if provided (needed for opportunistic offers). Prefer
    // lat/lng already resolved client-side (Mapbox's address_data), falling
    // back to a server-side geocode only if that's missing.
    if (rest.address) {
      if (rest.address_data?.lat && rest.address_data?.lng) {
        updateData.lat = rest.address_data.lat;
        updateData.lng = rest.address_data.lng;
      } else {
        try {
          const geo = await geocodeAddress(rest.address);
          if (geo) {
            updateData.lat = geo.lat;
            updateData.lng = geo.lng;
            updateData.quadrant = geo.quadrant;
          }
        } catch {
          // best-effort — don't fail the update over geocoding
        }
      }
    }

    const { error: updateError } = await supabaseAdmin.from('leads').update(updateData).eq('session_id', session_id);
    if (updateError) console.error('capture-lead update failed:', updateError.message, { session_id, fields: Object.keys(updateData) });
    const { data: leadForEvent } = await supabaseAdmin.from('leads').select('id').eq('session_id', session_id).maybeSingle();
    if (leadForEvent?.id) {
      await recordTimelineEvent({
        entity_type: 'lead',
        entity_id: leadForEvent.id,
        event_type: 'lead_updated',
        source: 'booking_flow',
        after: updateData,
        metadata: { session_id },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'price_reveal') {
    const { ai_price_estimate, load_size, photos, itemized } = rest;
    // Update the lead row with the latest quote info + photos + itemized.
    const leadUpdate = {
      ai_price_estimate,
      load_size,
      quote_revealed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (photos) leadUpdate.photos = photos;
    if (itemized) leadUpdate.description_text = JSON.stringify(itemized);

    // Fetch lead_id for the quote history insert.
    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('session_id', session_id)
      .single();

    await supabaseAdmin.from('leads').update(leadUpdate).eq('session_id', session_id);

    // Insert a row into lead_quotes so we keep the full history.
    if (leadRow && ai_price_estimate) {
      try {
        await supabaseAdmin.from('lead_quotes').insert({
          lead_id: leadRow.id,
          price: ai_price_estimate,
          load_size,
          photos: photos || null,
          itemized: itemized || null,
        });
      } catch {} // best-effort — don't fail the quote over history
    }

    if (ai_price_estimate && hasRealPhone) {
      // Same rule as the welcome SMS above: never let a failed send block
      // the customer from seeing their price and continuing to book.
      try {
        await sendSMS(
          normalizedPhone || phone,
          `Your Junk Haul Calgary quote: $${ai_price_estimate}. $50 deposit locks in your slot. Book here: https://junkhaul.ca/book — quote valid 48 hrs.`,
          { lead_id: leadRow?.id || null, message_type: 'lead_price_reveal', workflow_action: 'price_reveal' }
        );
      } catch (e) {
        console.error('lead_price_reveal SMS failed:', e.message);
      }
    }
    if (leadRow?.id) {
      await recordTimelineEvent({
        entity_type: 'lead',
        entity_id: leadRow.id,
        event_type: 'quote_revealed',
        source: 'booking_flow',
        metadata: { ai_price_estimate, load_size, photo_count: photos?.length || 0 },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'step') {
    // Funnel tracking — fire on every step change. Works with session_id
    // alone so the price_first variant can track steps before the phone is
    // captured (phone may be 'pending').
    const { step_name } = rest;
    if (!step_name) return NextResponse.json({ ok: true });
    const stepUpdate = {
      last_step_reached: step_name,
      last_step_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (rest.ab_variant) {
      stepUpdate.ab_variant = rest.ab_variant;
      stepUpdate.ab_variant_assigned_at = new Date().toISOString();
    }
    try {
      await supabaseAdmin.from('leads').update(stepUpdate).eq('session_id', session_id);
    } catch {}
    const { data: leadForStep } = await supabaseAdmin.from('leads').select('id').eq('session_id', session_id).maybeSingle();
    if (leadForStep?.id) {
      try {
        await supabaseAdmin.from('funnel_events').insert({
          session_id,
          lead_id: leadForStep.id,
          event_type: 'booking_step',
          step: step_name,
          metadata: { ab_variant: rest.ab_variant || null },
        });
      } catch {}
      await recordTimelineEvent({
        entity_type: 'lead',
        entity_id: leadForStep.id,
        event_type: 'booking_step',
        source: 'booking_flow',
        metadata: { step: step_name, session_id },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'convert') {
    const { data: leadForConvert } = await supabaseAdmin.from('leads').select('id').eq('session_id', session_id).maybeSingle();
    await supabaseAdmin.from('leads').update({ converted_to_booking_id: rest.booking_id, updated_at: new Date().toISOString() }).eq('session_id', session_id);
    if (leadForConvert?.id) {
      await recordTimelineEvent({
        entity_type: 'lead',
        entity_id: leadForConvert.id,
        event_type: 'converted_to_booking',
        source: 'booking_flow',
        metadata: { booking_id: rest.booking_id },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'out_of_area') {
    // Customer is outside our service area — save their info so we can
    // reach out when we expand. Still valuable as a lead.
    const leadData = {
      phone: normalizedPhone || phone,
      normalized_phone: normalizedPhone,
      session_id,
      source: rest.source || 'web',
      name: rest.name || null,
      address: rest.address || null,
      address_data: rest.address_data || null,
      email: rest.email || null,
      updated_at: new Date().toISOString(),
    };

    // Try with out_of_area columns — if they don't exist yet, the upsert
    // will still work with the base fields
    const { error } = await supabaseAdmin.from('leads').upsert(
      leadData,
      { onConflict: 'session_id' }
    );

    // Try to update out_of_area flag separately (may fail if column doesn't exist)
    if (!error) {
      try {
        await supabaseAdmin.from('leads')
          .update({ out_of_area: true, out_of_area_notes: rest.notes || null })
          .eq('session_id', session_id);
      } catch {}
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify operator about the out-of-area lead
    try {
      await sendSMS(
        process.env.HAMMAD_PHONE || '+18259458282',
        `Out-of-area lead: ${rest.name || 'Unknown'} at ${rest.address || 'unknown address'}. Phone: ${phone}. They want service when we expand.`,
        { message_type: 'out_of_area_lead', workflow_action: 'operator_alert' }
      );
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, out_of_area: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
