import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

// GET /api/admin/bookings/[id]/timeline
export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, {
    permission: 'admin.read',
    entityType: 'booking',
    entityId: id,
    action: 'booking_timeline.read',
    metadata: { route: '/api/admin/bookings/[id]/timeline' },
  });
  if (!auth.ok) return auth.response;

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
