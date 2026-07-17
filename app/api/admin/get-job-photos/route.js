import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

const SIGNED_URL_SECONDS = 300;

async function withSignedCrewUrl(photo) {
  if (!photo?.path) return photo?.url || null;
  const bucket = photo.bucket || 'job-photos';
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(photo.path, SIGNED_URL_SECONDS);
  if (error) return null;
  return data?.signedUrl || null;
}

// GET /api/admin/get-job-photos?booking_id=...  or  ?phone=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  const phone = searchParams.get('phone');
  const auth = await requireStaffPermission(req, {
    permission: 'media.view',
    entityType: 'booking',
    entityId: bookingId || null,
    action: 'booking.view_photos',
  });
  if (!auth.ok) return auth.response;

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
    .filter((p) => p.type === 'crew_arrival');
  const crewCompletionPhotos = crewPhotos
    .filter((p) => p.type === 'crew_completion');

  return NextResponse.json({
    booking_id: booking.id,
    customer_name: booking.name,
    job_date: booking.job_date,
    address: booking.address,
    status: booking.status,
    crew_arrived_at: booking.crew_arrived_at,
    customer_photos: customerPhotos,
    crew_arrival_photos: await Promise.all(crewArrivalPhotos.map(withSignedCrewUrl)),
    crew_completion_photos: await Promise.all(crewCompletionPhotos.map(withSignedCrewUrl)),
    signed_url_expires_in_seconds: SIGNED_URL_SECONDS,
    total_crew_photos: crewPhotos.length,
  });
}
