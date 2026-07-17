import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertDonationUploadAllowed, storeDonationPhoto } from '@/lib/donationPhotos';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const form = await req.formData();
    const donationRequestId = form.get('donation_request_id');
    const token = form.get('token');
    const photoType = form.get('photo_type');
    const replacePhotoId = form.get('replace_photo_id') || null;
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'file is required.' }, { status: 400 });
    const photo = await storeDonationPhoto({ donationRequestId, token, file, photoType, replacePhotoId });
    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: donationRequestId,
      event_type: 'donation_photo_uploaded',
      actor_type: 'customer',
      source: 'donation_upload',
      metadata: { photo_id: photo.id, photo_type: photo.photo_type, file_size_bytes: photo.file_size_bytes },
    });
    return NextResponse.json({ ok: true, photo });
  } catch (err) {
    console.error('donation photo upload failed:', err);
    return NextResponse.json({ error: err.message || 'Could not upload photo.' }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const { donation_request_id, token, photo_id } = await req.json();
    await assertDonationUploadAllowed({ donationRequestId: donation_request_id, token });
    const { data: photo } = await supabaseAdmin
      .from('donation_request_photos')
      .update({ removed_at: new Date().toISOString(), retention_state: 'removed' })
      .eq('id', photo_id)
      .eq('donation_request_id', donation_request_id)
      .select()
      .maybeSingle();
    if (!photo) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: donation_request_id,
      event_type: 'donation_photo_removed',
      actor_type: 'customer',
      source: 'donation_upload',
      metadata: { photo_id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not remove photo.' }, { status: 400 });
  }
}
