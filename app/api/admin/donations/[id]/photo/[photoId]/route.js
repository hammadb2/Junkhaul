import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDonationPhotoSignedUrl } from '@/lib/donationPhotos';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { id, photoId } = await params;
  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request',
    entityId: id,
    action: 'donation_photo.view',
    metadata: { photo_id: photoId },
  });
  if (!auth.ok) return auth.response;
  const { data: photo } = await supabaseAdmin
    .from('donation_request_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('donation_request_id', id)
    .is('removed_at', null)
    .maybeSingle();
  if (!photo?.storage_path) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  const url = await getDonationPhotoSignedUrl(photo.storage_path, 300);
  return NextResponse.redirect(url);
}
