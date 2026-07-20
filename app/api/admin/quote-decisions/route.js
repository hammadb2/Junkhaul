import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// Exception queue: pending quote decisions ordered by financial exposure
// (minimum - proposed) and customer wait time.
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'bookings.override', action: 'quote_decisions.list' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');

  let q = supabaseAdmin
    .from('quote_decisions')
    .select('*')
    .order('created_at', { ascending: true });

  if (state) {
    q = q.eq('state', state);
  } else {
    q = q.in('state', ['manual_review', 'needs_evidence', 'approved']);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withExposure = (data || []).map((d) => ({
    ...d,
    exposure_cents: Math.max(0, (d.minimum_price_cents || 0) - (d.price_cents || 0)),
  }));

  // Highest exposure first, then oldest.
  withExposure.sort((a, b) => b.exposure_cents - a.exposure_cents || new Date(a.created_at) - new Date(b.created_at));

  return NextResponse.json({ decisions: withExposure });
}
