import { NextResponse } from 'next/server';
import { supabaseAdmin, DONATION_PHOTO_BUCKET } from '@/lib/supabase';
import { assertDonationUploadAllowed, storeDonationPhoto } from '@/lib/donationPhotos';
import { recordTimelineEvent } from '@/lib/timeline';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

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
    assertRateLimit({ scope: 'donation_photo_ip', key: getClientKey(req, donationRequestId), limit: 30, windowMs: 60 * 60 * 1000 });
    assertRateLimit({ scope: 'donation_photo_request', key: donationRequestId, limit: 20, windowMs: 60 * 60 * 1000 });
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
    return NextResponse.json(
      { error: err.message || 'Could not upload photo.' },
      { status: err.status || 400, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }
}

export async function DELETE(req) {
  try {
    const { donation_request_id, token, photo_id } = await req.json();
    assertRateLimit({ scope: 'donation_photo_delete_ip', key: getClientKey(req, donation_request_id), limit: 30, windowMs: 60 * 60 * 1000 });
    await assertDonationUploadAllowed({ donationRequestId: donation_request_id, token });
    const { data: photo } = await supabaseAdmin
      .from('donation_request_photos')
      .update({ removed_at: new Date().toISOString(), retention_state: 'removed' })
      .eq('id', photo_id)
      .eq('donation_request_id', donation_request_id)
      .select()
      .maybeSingle();
    if (!photo) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    if (photo.storage_path) {
      await supabaseAdmin.storage.from(DONATION_PHOTO_BUCKET).remove([photo.storage_path]).catch(() => {});
    }
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
    return NextResponse.json(
      { error: err.message || 'Could not remove photo.' },
      { status: err.status || 400, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }
}
