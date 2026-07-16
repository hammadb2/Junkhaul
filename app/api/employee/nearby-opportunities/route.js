import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { edmontonNowParts } from '@/lib/dates';
import {
  computeTruckFill,
  computeDiscountedPrice,
  rankLeads,
} from '@/lib/discountEngine';

export const runtime = 'nodejs';

// GET /api/employee/nearby-opportunities — finds waitlist customers,
// future bookings, AND quoted-but-unbooked leads within 3km of
// the crew's current position. Uses employee session auth.
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the crew's latest position (scoped to this employee)
  const { data: loc } = await supabaseAdmin
    .from('crew_location')
    .select('*')
    .eq('employee_id', employee.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: try without employee_id filter (legacy)
  let crewLat, crewLng;
  if (loc) {
    crewLat = loc.latitude;
    crewLng = loc.longitude;
  } else {
    const { data: anyLoc } = await supabaseAdmin
      .from('crew_location')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!anyLoc) return NextResponse.json({ opportunities: [] });
    crewLat = anyLoc.latitude;
    crewLng = anyLoc.longitude;
  }

  // ── Waitlist entries within 3km ──────────────
  const { data: waitlist } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('offered_nearby_today', false)
    .is('converted_to_booking_id', null)
    .gt('expires_at', new Date().toISOString());

  // ── Future-day confirmed bookings within 3km ─
  const { date: todayStr } = edmontonNowParts();
  const { data: futureBookings } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .neq('job_date', todayStr)
    .eq('status', 'confirmed')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('opportunistic', false);

  // ── Quoted-but-unbooked leads within 3km ─────
  const now = new Date().toISOString();
  const { data: unbookedLeads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('ai_price_estimate', 'is', null)
    .is('converted_to_booking_id', null)
    .or(`opportunistic_cooldown_until.is.null,opportunistic_cooldown_until.lt.${now}`);

  // ── Compute truck fill from today's jobs ──────
  const { data: todayJobs } = await supabaseAdmin
    .from('bookings')
    .select('load_size, ai_weight_estimate_kg, crew_status')
    .eq('job_date', todayStr)
    .in('crew_status', ['en_route', 'arrived', 'in_progress', 'complete']);

  const truckFill = computeTruckFill(todayJobs || []);
  const hourOfDay = new Date().getHours();
  const bookingsToday = (todayJobs || []).length;

  const opportunities = [];

  for (const entry of waitlist || []) {
    const dist = haversineKm(crewLat, crewLng, entry.lat, entry.lng);
    if (dist <= 3.0) {
      opportunities.push({
        waitlist_id: entry.id,
        booking_id: null,
        lead_id: null,
        customer_type: 'waitlist',
        name: entry.name,
        phone: entry.phone,
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
        distance_km: dist,
        load_size: entry.load_size,
        joined_at: entry.created_at,
        offer_type: 'waitlist',
        truck_fill_pct: truckFill.fillPct,
      });
    }
  }

  for (const booking of futureBookings || []) {
    const dist = haversineKm(crewLat, crewLng, booking.lat, booking.lng);
    if (dist <= 3.0) {
      opportunities.push({
        booking_id: booking.id,
        waitlist_id: null,
        lead_id: null,
        customer_type: 'future_booking',
        name: booking.name,
        phone: booking.phone,
        address: booking.address,
        lat: booking.lat,
        lng: booking.lng,
        distance_km: dist,
        load_size: booking.load_size,
        joined_at: booking.created_at,
        offer_type: 'future_booking',
        truck_fill_pct: truckFill.fillPct,
      });
    }
  }

  const leadCandidates = (unbookedLeads || []).filter(
    (l) => haversineKm(crewLat, crewLng, l.lat, l.lng) <= 3.0
  );

  const rankedLeads = rankLeads({
    leads: leadCandidates,
    crewLat,
    crewLng,
    computeDiscountForLead: (lead, detourKm) =>
      computeDiscountedPrice({
        originalPrice: lead.ai_price_estimate,
        load_size: lead.load_size || 'quarter',
        quadrant: lead.quadrant || 'NE',
        detourKm,
        fillPct: truckFill.fillPct,
        hourOfDay,
        bookingsToday,
      }),
  });

  for (const lead of rankedLeads) {
    opportunities.push({
      waitlist_id: null,
      booking_id: null,
      lead_id: lead.id,
      customer_type: 'lead',
      name: lead.name || 'Quoted customer',
      phone: lead.phone,
      address: lead.address,
      lat: lead.lat,
      lng: lead.lng,
      distance_km: lead.detourKm,
      load_size: lead.load_size,
      joined_at: lead.created_at,
      offer_type: 'deadhead',
      original_price: lead.discount.originalPrice,
      discounted_price: lead.discount.discountedPrice,
      discount_percent: lead.discount.discountPct,
      savings: lead.discount.savings,
      profitability_score: lead.profitabilityScore,
      truck_fill_pct: truckFill.fillPct,
    });
  }

  opportunities.sort((a, b) => {
    if (a.offer_type === 'deadhead' && b.offer_type !== 'deadhead') return -1;
    if (a.offer_type !== 'deadhead' && b.offer_type === 'deadhead') return 1;
    if (a.offer_type === 'deadhead') return b.profitability_score - a.profitability_score;
    return a.distance_km - b.distance_km;
  });

  return NextResponse.json({ opportunities, truck_fill: truckFill });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
