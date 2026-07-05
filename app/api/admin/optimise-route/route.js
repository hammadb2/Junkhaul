import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { optimiseRoute } from '@/lib/route';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST { date } -> ordered list of booking ids for that operating day.
export async function POST(req) {
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('job_date', date)
    .in('status', ['confirmed', 'rescheduled'])
    .order('job_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ordered = await optimiseRoute(bookings);
  return NextResponse.json({
    order: ordered.map((b, i) => ({
      position: i + 1,
      id: b.id,
      booking_ref: b.booking_ref,
      name: b.name,
      address: b.address,
      quadrant: b.quadrant,
      job_time: b.job_time,
      lat: b.lat,
      lng: b.lng,
    })),
  });
}
