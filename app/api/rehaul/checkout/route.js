import { NextResponse } from 'next/server';
import { createOrder, calculateOrderTotals } from '@/lib/rehaulOrders';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json();
  try {
    if (body.cart_id && !body.create_order) {
      const totals = await calculateOrderTotals({
        cartId: body.cart_id,
        deliveryAddress: body.delivery_address,
      });
      return NextResponse.json({ totals });
    }
    const order = await createOrder({
      cartId: body.cart_id,
      deliveryAddress: body.delivery_address,
      finalSaleAccepted: body.final_sale_accepted,
      finalSaleVersion: body.final_sale_version,
    });
    if (order.deliveryReviewRequired) {
      return NextResponse.json(order, { status: 409 });
    }
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
