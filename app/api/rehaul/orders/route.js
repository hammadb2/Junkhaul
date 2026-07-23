import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transitionOrderStatus } from '@/lib/rehaulOrders';
import { isMoneyAffectingTransition } from '@/lib/rehaulOrderPolicy';

export const runtime = 'nodejs';

export async function POST(req) {
  // Require an authenticated Rehaul user. Previously this route computed a
  // userId from the Bearer token but never used it, so an anonymous caller
  // could transition any order to any status (audit finding H1).
  const authHeader = req.headers.get('authorization');
  let userId = null;
  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    userId = user?.id || null;
  }
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await req.json();

  // Money-affecting statuses (paid, authorized-exception refund) are never
  // settable through this public endpoint — `paid` must come from a real
  // payment event and a refund is a staff action. Both are hard-blocked until
  // Rehaul commerce is actually built with payment collection + staff RBAC
  // (audit H1/H2). Fulfillment-workflow transitions still flow through below.
  if (isMoneyAffectingTransition(body.to_status)) {
    return NextResponse.json(
      { error: 'This status can only be set by a payment or authorized staff process.' },
      { status: 403 },
    );
  }

  try {
    const order = await transitionOrderStatus({
      orderId: body.order_id,
      toStatus: body.to_status,
      reason: body.reason,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
