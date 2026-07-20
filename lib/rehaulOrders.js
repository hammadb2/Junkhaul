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
  const { data, error } = await client.rpc('rehaul_reserve_listing_in_cart', {
    p_cart_id: cartId,
    p_listing_id: listingId,
  });
  if (error) throw error;
  if (!data?.ok) {
    const code = data?.code || 'reservation_failed';
    throw new Error(code);
  }
  return {
    cartItem: { id: data.cart_item_id, listing_id: listingId, price_cents: data.price_cents },
    reservation: { id: data.reservation_id, expires_at: data.expires_at },
    reserved: true,
  };
}

export async function calculateOrderTotals({ cartId, deliveryAddress, client = supabaseAdmin }) {
  const { data: cart } = await client.from('rehaul_carts').select('*, rehaul_cart_items(*, rehaul_listings(*, inventory_items(*)))').eq('id', cartId).single();
  if (!cart) throw new Error('Cart not found');

  const subtotal = cart.rehaul_cart_items.reduce((s, it) => s + (it.price_cents || 0), 0);

  // Simplified delivery fee via cost ledger for one item; real version uses route engine.
  let deliveryFeeCents = null;
  let deliveryPricingStatus = 'delivery_review_required';
  let deliveryFailure = null;
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
      deliveryPricingStatus = 'priced';
    } catch (e) {
      deliveryFailure = {
        code: 'delivery_costing_failed',
        message: e.message,
      };
    }
  } else {
    deliveryFailure = { code: 'delivery_address_missing_coordinates' };
  }

  const taxRate = 0;
  const taxCents = 0;
  const total = deliveryFeeCents == null ? null : subtotal + deliveryFeeCents + taxCents;
  return {
    subtotal,
    deliveryFeeCents,
    deliveryPricingStatus,
    deliveryFailure,
    taxCents,
    taxRate,
    taxEvidenceSnapshot: {
      status: 'unapproved_placeholder',
      problem: 'No owner/accountant-approved Rehaul tax configuration is present.',
    },
    total,
  };
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
  if (totals.deliveryPricingStatus !== 'priced') {
    const { data: exception, error: exceptionError } = await client.from('rehaul_delivery_exceptions').insert({
      tenant_id: cart.tenant_id,
      cart_id: cartId,
      exception_type: 'delivery_review_required',
      status: 'open',
      original_failure: totals.deliveryFailure || { code: 'delivery_review_required' },
    }).select().single();
    if (exceptionError) throw exceptionError;
    return {
      deliveryReviewRequired: true,
      code: 'delivery_review_required',
      exception,
      totals,
    };
  }

  const { data, error } = await client.rpc('rehaul_create_order_from_cart', {
    p_cart_id: cartId,
    p_delivery_address: deliveryAddress,
    p_delivery_fee_cents: totals.deliveryFeeCents,
    p_tax_cents: totals.taxCents,
    p_tax_rate: totals.taxRate,
    p_tax_config_version_id: null,
    p_tax_evidence_snapshot: totals.taxEvidenceSnapshot,
    p_final_sale_version: finalSaleVersion,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.code || 'order_creation_failed');

  const { data: order, error: orderError } = await client.from('rehaul_orders').select('*').eq('id', data.order_id).single();
  if (orderError) throw orderError;
  const { data: orderItems, error: orderItemsError } = await client.from('rehaul_order_items').select('*').eq('order_id', data.order_id);
  if (orderItemsError) throw orderItemsError;
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
