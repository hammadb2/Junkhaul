import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { geocodeAddress } from '@/lib/geocode';

export const runtime = 'nodejs';

export async function POST(req) {
  const { phone, session_id, action, ...rest } = await req.json();
  if (!phone || !session_id) return NextResponse.json({ error: 'phone and session_id required' }, { status: 400 });

  if (action === 'init') {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert({
        phone,
        session_id,
        source: rest.source || 'web',
        // UTM / click-ID capture at first touch (Step 2)
        utm_source: rest.utm_source || null,
        utm_medium: rest.utm_medium || null,
        utm_campaign: rest.utm_campaign || null,
        gclid: rest.gclid || null,
        fbclid: rest.fbclid || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await sendSMS(phone, `Junk Haul Calgary here! Upload your photos and we'll get you an instant price. Questions? Call or text (587) 325-0751`, null, 'lead_welcome');
    return NextResponse.json({ ok: true, lead_id: data.id });
  }

  if (action === 'update') {
    const updateData = { ...rest, updated_at: new Date().toISOString() };

    // Geocode address if provided (needed for opportunistic offers)
    if (rest.address && !rest.lat) {
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

    await supabaseAdmin.from('leads').update(updateData).eq('session_id', session_id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'price_reveal') {
    const { ai_price_estimate, load_size } = rest;
    await supabaseAdmin.from('leads').update({
      ai_price_estimate,
      load_size,
      quote_revealed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('session_id', session_id);
    if (ai_price_estimate) {
      await sendSMS(phone, `Your Junk Haul Calgary quote: $${ai_price_estimate}. $50 deposit locks in your slot. Book here: https://junkhaul.ca/book — quote valid 48 hrs.`, null, 'lead_price_reveal');
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'convert') {
    await supabaseAdmin.from('leads').update({ converted_to_booking_id: rest.booking_id, updated_at: new Date().toISOString() }).eq('session_id', session_id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'out_of_area') {
    // Customer is outside our service area — save their info so we can
    // reach out when we expand. Still valuable as a lead.
    const leadData = {
      phone,
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
      await supabaseAdmin.from('leads')
        .update({ out_of_area: true, out_of_area_notes: rest.notes || null })
        .eq('session_id', session_id).catch(() => {});
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify operator about the out-of-area lead
    try {
      await sendSMS(
        process.env.HAMMAD_PHONE || '+18259458282',
        `Out-of-area lead: ${rest.name || 'Unknown'} at ${rest.address || 'unknown address'}. Phone: ${phone}. They want service when we expand.`,
        null,
        'out_of_area_lead'
      );
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, out_of_area: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
