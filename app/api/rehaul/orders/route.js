import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transitionOrderStatus } from '@/lib/rehaulOrders';

export const runtime = 'nodejs';

export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  let userId = null;
  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    userId = user?.id;
  }

  const body = await req.json();
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
