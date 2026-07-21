import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';
import { edmontonNowParts } from '@/lib/dates';
import {
  computeTruckFill,
  computeDiscountedPrice,
  rankLeads,
} from '@/lib/discountEngine';
import { isKillSwitchOn, cronStarted, cronFinished, cronFailed, logEvent } from '@/lib/audit';
import { createExpectedReply } from '@/lib/quoInbound';

export const runtime = 'nodejs';

// ============================================================
// OPPORTUNISTIC OFFER CRON — two modes:
//
// 1. LIVE MODE (every 5 minutes while a job is in progress):
//    Matches the live truck GPS against nearby unbooked leads
//    and sends deadhead-discount offers.
//
// 2. PROACTIVE MODE (morning pre-fill, runs at 8 AM):
//    Runs against the day's scheduled route to pre-fill gaps
//    before the truck leaves the depot. Texts nearby unconverted
//    leads a "we'll be in your area Thursday between 10-12" offer.
//
// Both modes use the same discount curve from lib/discountEngine.
// ============================================================

const UHAUL_DEPOT = { lat: 51.0595, lng: -114.0447 };

export async function GET(req) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get('mode') || 'live';
    const cronName = mode === 'proactive' ? 'opportunistic-offer-proactive' : 'opportunistic-offer-live';
    await cronStarted(cronName);

    if (!(await isKillSwitchOn(cronName === 'opportunistic-offer-live' ? 'opportunistic_live' : 'opportunistic_proactive'))) {
      await cronFinished(cronName, { skipped: true, reason: 'kill_switch_off' });
      return NextResponse.json({ ok: true, skipped: true, reason: 'kill_switch_off' });
    }

    const { date: todayStr, hour } = edmontonNowParts();

    const result = mode === 'proactive'
      ? await runProactiveMode(todayStr, hour)
      : await runLiveMode(todayStr, hour);

    await cronFinished(cronName, result);
    return NextResponse.json(result);
  } catch (error) {
    await cronFailed('opportunistic-offer', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// ── LIVE MODE ──────────────────────────────────────────────
async function runLiveMode(todayStr, hour) {
  const { data: loc } = await supabaseAdmin
    .from('crew_location')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!loc) {
    return { ok: true, mode: 'live', message: 'No active crew location' };
  }

  const { data: activeJob } = await supabaseAdmin
    .from('bookings')
    .select('id, crew_status')
    .eq('job_date', todayStr)
    .in('crew_status', ['en_route', 'arrived', 'in_progress'])
    .limit(1)
    .maybeSingle();

  if (!activeJob) {
    return { ok: true, mode: 'live', message: 'No active job' };
  }

  const { data: todayJobs } = await supabaseAdmin
    .from('bookings')
    .select('load_size, ai_weight_estimate_kg, crew_status')
    .eq('job_date', todayStr)
    .in('crew_status', ['en_route', 'arrived', 'in_progress', 'complete']);

  const truckFill = computeTruckFill(todayJobs || []);

  if (truckFill.remainingKg < 150) {
    return { ok: true, mode: 'live', message: 'Truck nearly full', truck_fill: truckFill.fillPct };
  }

  const now = new Date().toISOString();
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('ai_price_estimate', 'is', null)
    .is('converted_to_booking_id', null)
    .or(`opportunistic_cooldown_until.is.null,opportunistic_cooldown_until.lt.${now}`);

  const nearbyLeads = (leads || []).filter(
    (l) => haversineKm(loc.latitude, loc.longitude, l.lat, l.lng) <= 3.0
  );

  if (nearbyLeads.length === 0) {
    return { ok: true, mode: 'live', message: 'No nearby leads' };
  }

  const bookingsToday = (todayJobs || []).length;
  const ranked = await rankLeads({
    leads: nearbyLeads,
    crewLat: loc.latitude,
    crewLng: loc.longitude,
    computeDiscountForLead: (lead, detourKm) =>
      computeDiscountedPrice({
        originalPrice: lead.ai_price_estimate,
        load_size: lead.load_size || 'quarter',
        quadrant: lead.quadrant || 'NE',
        detourKm,
        fillPct: truckFill.fillPct,
        hourOfDay: hour,
        bookingsToday,
      }),
  });

  const topLead = ranked[0];
  let sentCount = 0;

  try {
    const discount = topLead.discount;
    const distKm = Math.round(topLead.detourKm * 10) / 10;

    const smsBody = `Hi ${topLead.name || 'there'}, Junk Haul Calgary here! Our truck is near you (${distKm}km away) and has space. We can do your pickup right now for $${discount.discountedPrice} (normally $${discount.originalPrice} — you save $${discount.savings}). Reply YES in the next 15 minutes to lock it in, or call (587) 325-0751.`;

    await sendSMS(topLead.phone, smsBody, null, 'deadhead_offer');

    const offerExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: newOffer } = await supabaseAdmin.from('nearby_offers').insert({
      lead_id: topLead.id,
      customer_phone: topLead.phone,
      customer_name: topLead.name,
      offer_type: 'deadhead',
      offer_expires_at: offerExpiresAt,
      original_price: discount.originalPrice,
      discounted_price: discount.discountedPrice,
      discount_percent: discount.discountPct,
      crew_lat: loc.latitude,
      crew_lng: loc.longitude,
      distance_km: topLead.detourKm,
    }).select().single();

    // So a "YES" reply can actually be matched back to this offer — see
    // app/api/sms-webhook/route.js and lib/nearbyOfferAcceptance.js.
    if (newOffer) {
      try {
        await createExpectedReply({
          phone: topLead.phone,
          entity_type: 'nearby_offer',
          entity_id: newOffer.id,
          expected_intent: 'confirm_offer',
          valid_responses: ['YES', 'Y', 'CONFIRM', 'OK'],
          expires_at: offerExpiresAt,
        });
      } catch (err) {
        console.error('Failed to create expected reply for deadhead offer:', err.message);
      }
    }

    await supabaseAdmin
      .from('leads')
      .update({
        opportunistic_offer_sent: true,
        opportunistic_offer_sent_at: new Date().toISOString(),
        opportunistic_cooldown_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', topLead.id);

    await logEvent({
      event_type: 'deadhead_offer_sent',
      lead_id: topLead.id,
      customer_phone: topLead.phone,
      payload: {
        mode: 'live',
        original_price: discount.originalPrice,
        discounted_price: discount.discountedPrice,
        discount_percent: discount.discountPct,
        distance_km: topLead.detourKm,
        truck_fill: truckFill.fillPct,
      },
    });

    sentCount = 1;
  } catch (err) {
    console.error('Deadhead offer failed:', err);
  }

  return {
    ok: true,
    mode: 'live',
    sent: sentCount,
    truck_fill: truckFill.fillPct,
    candidates: ranked.length,
  };
}

// ── PROACTIVE MODE ─────────────────────────────────────────
async function runProactiveMode(todayStr, hour) {
  const { data: todayBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, name, phone, address, lat, lng, quadrant, load_size, ai_weight_estimate_kg, job_time')
    .eq('job_date', todayStr)
    .eq('status', 'confirmed')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  const bookingsCount = (todayBookings || []).length;
  const truckFill = computeTruckFill(todayBookings || []);

  if (truckFill.remainingKg < 150) {
    return { ok: true, mode: 'proactive', message: 'Truck already full' };
  }

  let centerLat = UHAUL_DEPOT.lat;
  let centerLng = UHAUL_DEPOT.lng;
  if (todayBookings && todayBookings.length > 0) {
    centerLat = todayBookings.reduce((s, b) => s + b.lat, 0) / todayBookings.length;
    centerLng = todayBookings.reduce((s, b) => s + b.lng, 0) / todayBookings.length;
  }

  const now = new Date().toISOString();
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('ai_price_estimate', 'is', null)
    .is('converted_to_booking_id', null)
    .or(`opportunistic_cooldown_until.is.null,opportunistic_cooldown_until.lt.${now}`);

  const nearbyLeads = (leads || []).filter(
    (l) => haversineKm(centerLat, centerLng, l.lat, l.lng) <= 5.0
  );

  if (nearbyLeads.length === 0) {
    return { ok: true, mode: 'proactive', message: 'No nearby leads', bookings_today: bookingsCount };
  }

  const ranked = await rankLeads({
    leads: nearbyLeads,
    crewLat: centerLat,
    crewLng: centerLng,
    computeDiscountForLead: (lead, detourKm) =>
      computeDiscountedPrice({
        originalPrice: lead.ai_price_estimate,
        load_size: lead.load_size || 'quarter',
        quadrant: lead.quadrant || 'NE',
        detourKm,
        fillPct: truckFill.fillPct,
        hourOfDay: 8,
        bookingsToday: bookingsCount,
      }),
  });

  let sentCount = 0;
  for (const lead of ranked.slice(0, 3)) {
    try {
      const discount = lead.discount;
      const smsBody = `Hi ${lead.name || 'there'}, Junk Haul Calgary here! We're doing pickups in your area ${todayStr === new Date().toISOString().slice(0, 10) ? 'today' : 'this ' + new Date(todayStr).toLocaleDateString('en-CA', { weekday: 'long' })}. We have a gap and can do your pickup for $${discount.discountedPrice} (normally $${discount.originalPrice} — you save $${discount.savings}). Want to lock it in? Book here: https://junkhaul.ca/book or call (587) 325-0751.`;

      await sendSMS(lead.phone, smsBody, null, 'proactive_offer');

      await supabaseAdmin.from('nearby_offers').insert({
        lead_id: lead.id,
        customer_phone: lead.phone,
        customer_name: lead.name,
        offer_type: 'deadhead',
        offer_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        original_price: discount.originalPrice,
        discounted_price: discount.discountedPrice,
        discount_percent: discount.discountPct,
        distance_km: lead.detourKm,
      });

      await supabaseAdmin
        .from('leads')
        .update({
          opportunistic_offer_sent: true,
          opportunistic_offer_sent_at: new Date().toISOString(),
          opportunistic_cooldown_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      await logEvent({
        event_type: 'proactive_offer_sent',
        lead_id: lead.id,
        customer_phone: lead.phone,
        payload: {
          mode: 'proactive',
          original_price: discount.originalPrice,
          discounted_price: discount.discountedPrice,
          discount_percent: discount.discountPct,
          distance_km: lead.detourKm,
          truck_fill: truckFill.fillPct,
        },
      });

      sentCount++;
    } catch (err) {
      console.error('Proactive offer failed for lead', lead.id, err);
    }
  }

  return {
    ok: true,
    mode: 'proactive',
    sent: sentCount,
    candidates: ranked.length,
    bookings_today: bookingsCount,
    truck_fill: truckFill.fillPct,
  };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
