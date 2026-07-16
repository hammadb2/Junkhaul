import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/employee/offer-nearby — sends an opportunistic pickup offer
// SMS to a nearby customer. Uses employee session auth.
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, waitlist_id, lead_id } = body;
  if (!booking_id && !waitlist_id && !lead_id) {
    return NextResponse.json({ error: 'Missing booking_id, waitlist_id, or lead_id' }, { status: 400 });
  }

  let customer;
  let offerType = 'waitlist';
  let originalPrice = null;
  let discountedPrice = null;
  let discountPercent = null;

  if (lead_id) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .maybeSingle();
    customer = data;
    offerType = 'deadhead';
    originalPrice = body.original_price || customer?.ai_price_estimate || null;
    discountedPrice = body.discounted_price || null;
    discountPercent = body.discount_percent || null;
  } else if (waitlist_id) {
    const { data } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', waitlist_id)
      .maybeSingle();
    customer = data;
    offerType = 'waitlist';
  } else {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();
    customer = data;
    offerType = 'future_booking';
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: offer, error: offerErr } = await supabaseAdmin
    .from('nearby_offers')
    .insert({
      booking_id: booking_id || null,
      waitlist_id: waitlist_id || null,
      lead_id: lead_id || null,
      employee_id: employee.id,
      customer_phone: customer.phone,
      customer_name: customer.name,
      offer_expires_at: expiresAt,
      offer_type: offerType,
      original_price: originalPrice,
      discounted_price: discountedPrice,
      discount_percent: discountPercent,
    })
    .select()
    .single();

  if (offerErr) {
    return NextResponse.json({ error: offerErr.message }, { status: 500 });
  }

  if (waitlist_id) {
    await supabaseAdmin
      .from('waitlist')
      .update({
        offered_nearby_today: true,
        last_nearby_offer_at: new Date().toISOString(),
      })
      .eq('id', waitlist_id);
  }

  if (lead_id) {
    await supabaseAdmin
      .from('leads')
      .update({
        opportunistic_offer_sent: true,
        opportunistic_offer_sent_at: new Date().toISOString(),
        opportunistic_cooldown_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id);
  }

  let smsBody;
  if (lead_id && discountedPrice && originalPrice && discountedPrice < originalPrice) {
    smsBody = `Hi ${customer.name || 'there'}, Junk Haul Calgary here! Our truck is just ${Math.round(body.distance_km || 2)} minutes from you and has space. We can do your pickup right now for $${discountedPrice} (normally $${originalPrice} — you save $${originalPrice - discountedPrice}). Reply YES in the next 5 minutes to lock it in, or call (587) 325-0751.`;
  } else if (lead_id) {
    smsBody = `Hi ${customer.name || 'there'}, Junk Haul Calgary here! Our crew is nearby and has a gap. We can do your pickup right now for $${originalPrice || discountedPrice}. Reply YES in the next 5 minutes, or call (587) 325-0751.`;
  } else {
    smsBody = `Hi ${customer.name}, Junk Haul Calgary here! Our crew is just a few minutes from you and has a gap in the schedule. We can do your pickup right now at no extra charge — you'd only pay what you originally quoted. Reply YES in the next 5 minutes to confirm, or call (587) 325-0751.`;
  }

  try {
    await sendSMS(customer.phone, smsBody, booking_id || null, 'nearby_offer');
  } catch (err) {
    return NextResponse.json({ error: 'SMS failed' }, { status: 500 });
  }

  return NextResponse.json({ offer_id: offer.id });
}
