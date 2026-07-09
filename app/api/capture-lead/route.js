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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
