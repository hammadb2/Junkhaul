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

const CREW_PHOTO_BUCKET = 'job-photos';

export async function POST(req) {
  if (!(await checkAuth()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  const bookingId = form.get('booking_id');
  const type = form.get('type'); // 'crew_arrival' | 'crew_completion'

  if (!file || !bookingId || !type)
    return NextResponse.json(
      { error: 'file, booking_id, and type are required' },
      { status: 400 }
    );

  if (!['crew_arrival', 'crew_completion'].includes(type))
    return NextResponse.json(
      { error: 'type must be crew_arrival or crew_completion' },
      { status: 400 }
    );

  // ----------------------------------------------------------
  // 1. Ensure the storage bucket exists (create if missing).
  // ----------------------------------------------------------
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.id === CREW_PHOTO_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(CREW_PHOTO_BUCKET, { public: true });
  }

  // ----------------------------------------------------------
  // 2. Upload the file to Supabase Storage.
  // ----------------------------------------------------------
  const ext = (file.name || 'photo.jpg').split('.').pop() || 'jpg';
  const fileName = `${bookingId}/${type}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  const { data: uploadData, error: uploadError } = await supabaseAdmin
    .storage
    .from(CREW_PHOTO_BUCKET)
    .upload(fileName, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin
    .storage
    .from(CREW_PHOTO_BUCKET)
    .getPublicUrl(fileName);

  const publicUrl = urlData?.publicUrl;

  // ----------------------------------------------------------
  // 3. Append the photo record to crew_photos on the booking.
  // ----------------------------------------------------------
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select('crew_photos')
    .eq('id', bookingId)
    .single();

  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const existing = Array.isArray(booking.crew_photos) ? booking.crew_photos : [];
  const photoRecord = {
    url: publicUrl,
    type,
    path: fileName,
    uploaded_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      crew_photos: [...existing, photoRecord],
      crew_photos_taken_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}
