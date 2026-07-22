import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/freon-evidence — bookings where the AI photo scan
// reported a possible refrigerant-evacuation sticker (see Phase 5:
// bookings.freon_evacuation_status), awaiting staff verification. The
// freon fee is already fully charged on every one of these; verifying
// here only records the decision — any customer credit is a manual
// finance step (see the actions route's verify_freon_evidence handler).
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'bookings.review_quote', action: 'freon_evidence.list' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending_review';

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, booking_ref, name, address, photos, has_freon, freon_count, freon_fee, freon_evacuation_status, freon_evacuation_reviewed_by, freon_evacuation_reviewed_at, freon_evacuation_review_note, created_at')
    .eq('freon_evacuation_status', status)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: data || [] });
}
