import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { authorizeQuoteDecision } from '@/lib/quoteDecision';

export const runtime = 'nodejs';

// POST { reason, new_price_cents?, authorization_limit_cents? }
export async function POST(req, { params }) {
  const auth = await requireStaffPermission(req, { permission: 'bookings.override', ownerOnly: true, action: 'quote_decision.override' });
  if (!auth.ok) return auth.response;

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
