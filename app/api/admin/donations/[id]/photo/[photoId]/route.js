import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { getDonationPhotoSignedUrl } from '@/lib/donationPhotos';

export const runtime = 'nodejs';

async function checkAuth() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === await adminToken();
}

export async function GET(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, photoId } = await params;
  const { data: photo } = await supabaseAdmin
    .from('donation_request_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('donation_request_id', id)
    .maybeSingle();
  if (!photo?.storage_path) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  const url = await getDonationPhotoSignedUrl(photo.storage_path, 300);
  return NextResponse.redirect(url);
}
