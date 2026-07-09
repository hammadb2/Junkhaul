import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

// GET /api/admin/bookings/[id]/timeline
export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;

  try {
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('system_events')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const { data: offers, error: offersError } = await supabaseAdmin
      .from('nearby_offers')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (offersError) throw offersError;

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, created_at, status, total_price, surge_multiplier, surge_mode, base_price, dynamic_multiplier, same_day_fee, stairs_fee, freon_fee, balance_due, no_show_risk_score')
      .eq('id', id)
      .single();

    if (bookingError) throw bookingError;

    return NextResponse.json({
      booking,
      timeline: [
        ...(events || []).map((e) => ({ ...e, source: 'system_event' })),
        ...(messages || []).map((m) => ({ ...m, source: 'message', event_type: `sms_${m.direction || 'unknown'}` })),
        ...(offers || []).map((o) => ({ ...o, source: 'offer', event_type: 'offer_sent' })),
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Auth guard placeholder - will be added
