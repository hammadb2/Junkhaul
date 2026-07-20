import { NextResponse } from 'next/server';
import { getOrCreateCart, addToCart } from '@/lib/rehaulOrders';
import { getTenantByHost } from '@/lib/rehaul';

export const runtime = 'nodejs';

export async function POST(req) {
  const host = req.headers.get('host') || '';
  const tenant = await getTenantByHost(host);
  if (!tenant || tenant.slug !== 'rehaul') return NextResponse.json({ error: 'Not a Rehaul host' }, { status: 404 });

  const body = await req.json();
  try {
    const cart = await getOrCreateCart({
      tenantId: tenant.id,
      customerId: body.customer_id,
      sessionToken: body.session_token,
    });
    if (body.listing_id) {
      await addToCart({ cartId: cart.id, listingId: body.listing_id });
    }
    return NextResponse.json({ cart });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
