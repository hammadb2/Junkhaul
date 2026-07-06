import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

// GET /api/admin/get-job-photos?booking_id=...  or  ?phone=...
export async function GET(req) {
  if (!(await checkAuth()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  const phone = searchParams.get('phone');

  if (!bookingId && !phone)
    return NextResponse.json(
      { error: 'booking_id or phone is required' },
      { status: 400 }
    );

  let query = supabaseAdmin
    .from('bookings')
    .select(
      'id, name, job_date, address, status, photos, crew_photos, crew_arrived_at'
    );

  if (bookingId) {
    query = query.eq('id', bookingId);
  } else {
    query = query.eq('phone', phone);
  }

  const { data: booking, error } = await query.single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const crewPhotos = Array.isArray(booking.crew_photos) ? booking.crew_photos : [];
  const customerPhotos = Array.isArray(booking.photos) ? booking.photos : [];

  const crewArrivalPhotos = crewPhotos
    .filter((p) => p.type === 'crew_arrival')
    .map((p) => p.url);
  const crewCompletionPhotos = crewPhotos
    .filter((p) => p.type === 'crew_completion')
    .map((p) => p.url);

  return NextResponse.json({
    booking_id: booking.id,
    customer_name: booking.name,
    job_date: booking.job_date,
    address: booking.address,
    status: booking.status,
    crew_arrived_at: booking.crew_arrived_at,
    customer_photos: customerPhotos,
    crew_arrival_photos: crewArrivalPhotos,
    crew_completion_photos: crewCompletionPhotos,
    total_crew_photos: crewPhotos.length,
  });
}
