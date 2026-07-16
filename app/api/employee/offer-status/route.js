import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/offer-status?offer_id=...
// Lets the crew app poll the status of an opportunistic offer it sent.
// Returns: { status: 'pending' | 'accepted' | 'expired', offer }
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get('offer_id');
  if (!offerId) {
    return NextResponse.json({ error: 'Missing offer_id' }, { status: 400 });
  }

  const { data: offer, error } = await supabaseAdmin
    .from('nearby_offers')
    .select('*')
    .eq('id', offerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  // Derive an effective status. The stored `status` column is the source of
  // truth when present; fall back to the legacy `accepted` boolean + expiry.
  const now = new Date();
  const expired = offer.offer_expires_at && new Date(offer.offer_expires_at) <= now;

  let status;
  if (offer.status === 'accepted') {
    status = 'accepted';
  } else if (offer.status === 'expired' || expired) {
    status = 'expired';
  } else if (offer.accepted === true) {
    status = 'accepted';
  } else {
    status = 'pending';
  }

  return NextResponse.json({
    status,
    offer_id: offer.id,
    customer_name: offer.customer_name,
    customer_phone: offer.customer_phone,
    offer_expires_at: offer.offer_expires_at,
    offer_type: offer.offer_type,
    original_price: offer.original_price,
    discounted_price: offer.discounted_price,
    discount_percent: offer.discount_percent,
    converted_booking_id: offer.converted_booking_id || null,
  });
}
