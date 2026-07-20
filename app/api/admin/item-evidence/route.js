import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getEvidenceForBooking, recordReviewDecision } from '@/lib/itemEvidence';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const expected = await adminToken();
  return token && token === expected;
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) {
    const { data } = await supabaseAdmin.from('item_observations').select('*, item_estimates(*, item_dimensions(*)), item_hazards(*), item_review_decisions(*)').order('observed_at', { ascending: false }).limit(100);
    return NextResponse.json({ observations: data });
  }
  const observations = await getEvidenceForBooking(bookingId);
  return NextResponse.json({ observations });
}

export async function POST(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { observation_id, reviewer_id, decision, corrections, reason } = body;
  if (!observation_id || !reviewer_id || !decision || !reason) {
    return NextResponse.json({ error: 'observation_id, reviewer_id, decision, reason required' }, { status: 400 });
  }
  try {
    const result = await recordReviewDecision({
      observationId: observation_id,
      reviewerId: reviewer_id,
      decision,
      corrections,
      reason,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
