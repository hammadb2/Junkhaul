import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET /api/crew/photos/[booking_id] — returns crew photos for the customer
// photo viewer page. Public via booking UUID.
export async function GET(_req, { params }) {
  const { booking_id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('crew_photos')
    .eq('id', booking_id)
    .maybeSingle();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json({ photos: booking.crew_photos || [] });
}
