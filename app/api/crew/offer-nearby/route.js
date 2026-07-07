import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/crew/offer-nearby — sends an opportunistic pickup offer SMS to a
// nearby customer. Creates a nearby_offers record with a 5-minute expiry.
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { booking_id, waitlist_id } = body;
  if (!booking_id && !waitlist_id) {
    return NextResponse.json({ error: 'Missing booking_id or waitlist_id' }, { status: 400 });
  }

  // Look up the customer
  let customer;
  if (waitlist_id) {
    const { data } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', waitlist_id)
      .maybeSingle();
    customer = data;
  } else {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();
    customer = data;
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Create the offer record
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: offer, error: offerErr } = await supabaseAdmin
    .from('nearby_offers')
    .insert({
      booking_id: booking_id || null,
      waitlist_id: waitlist_id || null,
      customer_phone: customer.phone,
      customer_name: customer.name,
      offer_expires_at: expiresAt,
    })
    .select()
    .single();

  if (offerErr) {
    return NextResponse.json({ error: offerErr.message }, { status: 500 });
  }

  // Mark waitlist entry as offered today
  if (waitlist_id) {
    await supabaseAdmin
      .from('waitlist')
      .update({
        offered_nearby_today: true,
        last_nearby_offer_at: new Date().toISOString(),
      })
      .eq('id', waitlist_id);
  }

  // Send the offer SMS
  const smsBody = `Hi ${customer.name}, Junk Haul Calgary here! Our crew is just a few minutes from you and has a gap in the schedule. We can do your pickup right now at no extra charge — you'd only pay what you originally quoted. Reply YES in the next 5 minutes to confirm, or call (587) 325-0751.`;

  try {
    await sendSMS(customer.phone, smsBody, booking_id || null, 'nearby_offer');
  } catch (err) {
    return NextResponse.json({ error: 'SMS failed' }, { status: 500 });
  }

  return NextResponse.json({ offer_id: offer.id });
}
