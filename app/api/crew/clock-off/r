import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { crewAuth } from '@/lib/crewAuth';

export const runtime = 'nodejs';

// POST /api/crew/clock-off — ends the tracking session, logs end of day.
// Clears the active booking on the crew_location row and stops tracking.
export async function POST(req) {
  const authed = await crewAuth(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the latest tracking session
  const { data: loc } = await supabaseAdmin
    .from('crew_location')
    .select('tracking_session_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loc?.tracking_session_id) {
    // Clear the active booking (stops tracking effectively)
    await supabaseAdmin
      .from('crew_location')
      .update({
        active_booking_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_session_id', loc.tracking_session_id);
  }

  return NextResponse.json({ ok: true });
}
