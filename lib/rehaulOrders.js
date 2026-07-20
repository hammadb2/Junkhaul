// ============================================================
// rehaulOrders.js
//
// Rehaul cart, inventory reservation, checkout and order state machine.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { calculateRouteCost } from './costLedger.js';

const RESERVATION_MINUTES = 30;

export async function getOrCreateCart({ tenantId, customerId, sessionToken, client = supabaseAdmin }) {
  if (sessionToken) {
    const { data: existing } = await client.from('rehaul_carts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('session_token', sessionToken)
      .eq('status', 'active')
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await client.from('rehaul_carts').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    session_token: sessionToken,
    expires_at: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function addToCart({ cartId, listingId, client = supabaseAdmin }) {
  const { data: listing } = await client.from('rehaul_listings')
    .select('*, inventory_items(*)')
    .eq('id', listingId)
    .single();
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'published') throw new Error('Listing is not available');
  if (listing.inventory_items?.status !== 'ready') throw new Error('Inventory item is not available');

  // Reserve inventory
  const existingRes = await client.from('rehaul_inventory_reservations')
    .select('*')
    .eq('inventory_item_id', listing.inventory_item_id)
    .is('released_at', null)
    .maybeSingle();
  if (existingRes?.data) throw new Error('Item is already reserved');

  const { data: cartItem, error } = await client.from('rehaul_cart_items').insert({
    cart_id: cartId,
    listing_id: listingId,
    quantity: 1,
    price_cents: listing.listed_price_cents,
  }).select().single();
  if (error) throw error;

  await client.from('rehaul_inventory_reservations').insert({
    inventory_item_id: listing.inventory_item_id,
    cart_id: cartId,
    expires_at: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString(),
  });

  await client.from('inventory_items').update({ status: 'reserved' }).eq('id', listing.inventory_item_id);
  return { cartItem, reserved: true };
}

export async function calculateOrderTotals({ cartId, deliveryAddress, client = supabaseAdmin }) {
  const { data: cart } = await client.from('rehaul_carts').select('*, rehaul_cart_items(*, rehaul_listings(*, inventory_items(*)))').eq('id', cartId).single();
  if (!cart) throw new Error('Cart not found');

  const subtotal = cart.rehaul_cart_items.reduce((s, it) => s + (it.price_cents || 0), 0);

  // Simplified delivery fee via cost ledger for one item; real version uses route engine.
  let deliveryFeeCents = 0;
  const firstItem = cart.rehaul_cart_items[0]?.rehaul_listings?.inventory_items;
  if (firstItem && deliveryAddress?.lat && deliveryAddress?.lng) {
    try {
      const cost = await calculateRouteCost({
        routeType: 'rehaul_clean',
        bookings: [{
          id: cart.id,
          load_size: 'single_item',
          lat: deliveryAddress.lat,
          lng: deliveryAddress.lng,
          total_price: subtotal / 100,
        }],
        revenueCents: subtotal,
        client,
      });
      deliveryFeeCents = cost.breakdown.total_cost_cents;
    } catch (e) {
      deliveryFeeCents = 0;
    }
  }

  const taxRate = 0; // Alberta no PST, GST included in pricing by policy; evidence tracked per order.
  const taxCents = 0;
  const total = subtotal + deliveryFeeCents + taxCents;
  return { subtotal, deliveryFeeCents, taxCents, taxRate, total };
}

export async function createOrder({
  cartId,
  deliveryAddress,
  finalSaleAccepted,
  finalSaleVersion,
  client = supabaseAdmin,
}) {
  if (!finalSaleAccepted) throw new Error('Final-sale policy must be accepted');
  const { data: cart } = await client.from('rehaul_carts')
    .select('*, rehaul_cart_items(*, rehaul_listings(*, inventory_item_id))')
    .eq('id', cartId)
    .single();
  if (!cart) throw new Error('Cart not found');

  const totals = await calculateOrderTotals({ cartId, deliveryAddress, client });
  const { data: order, error } = await client.from('rehaul_orders').insert({
    tenant_id: cart.tenant_id,
    customer_id: cart.customer_id,
    cart_id: cartId,
    status: 'pending_payment',
    subtotal_cents: totals.subtotal,
    delivery_fee_cents: totals.deliveryFeeCents,
    tax_cents: totals.taxCents,
    tax_rate: totals.taxRate,
    total_cents: totals.total,
    final_sale_accepted: finalSaleAccepted,
    final_sale_version: finalSaleVersion,
    final_sale_accepted_at: new Date().toISOString(),
    delivery_address: deliveryAddress,
  }).select().single();
  if (error) throw error;

  const orderItems = cart.rehaul_cart_items.map((it) => ({
    order_id: order.id,
    listing_id: it.listing_id,
    inventory_item_id: it.rehaul_listings.inventory_item_id,
    price_cents: it.price_cents,
    quantity: it.quantity,
  }));
  const { error: oiError } = await client.from('rehaul_order_items').insert(orderItems);
  if (oiError) throw oiError;

  await client.from('rehaul_carts').update({ status: 'converted' }).eq('id', cartId);

  // Convert cart reservation to order reservation
  for (const it of cart.rehaul_cart_items) {
    await client.from('rehaul_inventory_reservations')
      .update({ order_id: order.id, cart_id: null, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .eq('inventory_item_id', it.rehaul_listings.inventory_item_id)
      .is('released_at', null);
  }

  return { order, orderItems, totals };
}

export async function transitionOrderStatus({ orderId, toStatus, reason, client = supabaseAdmin }) {
  const { data: order } = await client.from('rehaul_orders').select('*').eq('id', orderId).single();
  if (!order) throw new Error('Order not found');

  const valid = {
    pending_payment: ['paid', 'cancelled_by_business'],
    paid: ['scheduled', 'picking'],
    scheduled: ['picking'],
    picking: ['loaded'],
    loaded: ['out_for_delivery'],
    out_for_delivery: ['delivered', 'exception'],
    exception: ['statutory_remedy_review', 'refunded_by_authorized_exception'],
    statutory_remedy_review: ['refunded_by_authorized_exception', 'paid'],
  };
  if (!valid[order.status]?.includes(toStatus)) throw new Error(`Invalid order transition ${order.status} -> ${toStatus}`);

  const { data, error } = await client.from('rehaul_orders')
    .update({ status: toStatus })
    .eq('id', orderId)
    .select().single();
  if (error) throw error;
  return data;
}

export async function releaseExpiredReservations(client = supabaseAdmin) {
  const now = new Date().toISOString();
  const { data, error } = await client.from('rehaul_inventory_reservations')
    .update({ released_at: now })
    .lt('expires_at', now)
    .is('released_at', null)
    .select();
  if (error) throw error;

  for (const res of data || []) {
    await client.from('inventory_items').update({ status: 'ready' }).eq('id', res.inventory_item_id);
  }
  return data || [];
}
