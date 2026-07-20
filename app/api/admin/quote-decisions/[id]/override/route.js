import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { authorizeQuoteDecision } from '@/lib/quoteDecision';

export const runtime = 'nodejs';

// POST { reason, new_price_cents?, authorization_limit_cents? }
export async function POST(req, { params }) {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { reason, new_price_cents, authorization_limit_cents } = await req.json();
  if (!reason) {
    return NextResponse.json({ error: 'Override reason is required.' }, { status: 400 });
  }

  try {
    const decision = await authorizeQuoteDecision({
      decisionId: id,
      managerId: auth.context.user?.id || auth.context.employee?.id,
      reason,
      newPriceCents: new_price_cents ? Number(new_price_cents) : undefined,
      authorizationLimitCents: authorization_limit_cents ? Number(authorization_limit_cents) : undefined,
      client: supabaseAdmin,
    });
    return NextResponse.json({ decision });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
