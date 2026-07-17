import crypto from 'crypto';
import sharp from 'sharp';
import { supabaseAdmin, DONATION_PHOTO_BUCKET } from './supabase.js';
import { computeDHash } from './perceptualHash.js';

export const DONATION_PHOTO_TYPES = [
  'full_item_view',
  'condition_close_up',
  'damage_photo',
  'total_quantity_context',
  'label_or_model',
  'additional_angle',
];

export const REQUIRED_DONATION_PHOTO_TYPES = [
  'full_item_view',
  'condition_close_up',
  'damage_photo',
  'total_quantity_context',
];

export const MAX_DONATION_PHOTOS = 12;
export const MAX_DONATION_PHOTO_BYTES = 8 * 1024 * 1024;
export const ALLOWED_DONATION_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function newResumeToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function assertDonationUploadAllowed({ donationRequestId, token }) {
  if (!donationRequestId || !token) throw new Error('donation_request_id and token required');
  const { data: request, error } = await supabaseAdmin
    .from('donation_requests')
    .select('id, status, resume_token_hash')
    .eq('id', donationRequestId)
    .maybeSingle();
  if (error || !request) throw new Error('Donation request not found');
  if (request.resume_token_hash !== hashToken(token)) throw new Error('Invalid donation upload token');
  if (!['draft', 'needs_more_photos'].includes(request.status)) throw new Error('Donation request is not accepting uploads');
  return request;
}

export async function inspectDonationImage(buffer, declaredMime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Empty file');
  if (buffer.length > MAX_DONATION_PHOTO_BYTES) throw new Error('Photo exceeds 8MB limit');
  const meta = await sharp(buffer, { failOn: 'error' }).metadata();
  const formatToMime = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heif: 'image/heif',
    heic: 'image/heic',
  };
  const detectedMime = formatToMime[meta.format];
  if (!detectedMime || !ALLOWED_DONATION_MIME.has(detectedMime)) {
    throw new Error('Unsupported image type');
  }
  if (declaredMime && ALLOWED_DONATION_MIME.has(declaredMime) && declaredMime !== detectedMime) {
    // Not fatal for HEIC/HEIF aliases; fatal for common spoofed types.
    const heicPair = new Set([declaredMime, detectedMime]);
    if (!(heicPair.has('image/heic') && heicPair.has('image/heif'))) throw new Error('Declared MIME type does not match image content');
  }
  if ((meta.width || 0) < 320 || (meta.height || 0) < 320) throw new Error('Photo dimensions are too small');
  if ((meta.width || 0) > 8000 || (meta.height || 0) > 8000) throw new Error('Photo dimensions are too large');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  let perceptualHash = null;
  try { perceptualHash = await computeDHash(buffer); } catch { perceptualHash = null; }
  return { width: meta.width, height: meta.height, mimeType: detectedMime, sha256, perceptualHash };
}

export async function storeDonationPhoto({ donationRequestId, token, file, photoType, replacePhotoId = null }) {
  await assertDonationUploadAllowed({ donationRequestId, token });
  if (!DONATION_PHOTO_TYPES.includes(photoType)) throw new Error('Invalid donation photo category');

  const { count } = await supabaseAdmin
    .from('donation_request_photos')
    .select('id', { count: 'exact', head: true })
    .eq('donation_request_id', donationRequestId)
    .is('removed_at', null);
  if ((count || 0) >= MAX_DONATION_PHOTOS && !replacePhotoId) throw new Error('Maximum donation photo count reached');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const inspected = await inspectDonationImage(buffer, file.type);
  const ext = inspected.mimeType === 'image/png' ? 'png' : inspected.mimeType === 'image/webp' ? 'webp' : inspected.mimeType.includes('hei') ? 'heic' : 'jpg';
  const objectId = crypto.randomUUID();
  const storagePath = `${donationRequestId}/${photoType}/${objectId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DONATION_PHOTO_BUCKET)
    .upload(storagePath, buffer, { contentType: inspected.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabaseAdmin.storage
    .from(DONATION_PHOTO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  let uploadOrder = count || 0;
  if (replacePhotoId) {
    await supabaseAdmin.from('donation_request_photos')
      .update({ removed_at: new Date().toISOString(), retention_state: 'replaced' })
      .eq('id', replacePhotoId)
      .eq('donation_request_id', donationRequestId);
  }

  const { data: row, error } = await supabaseAdmin
    .from('donation_request_photos')
    .insert({
      donation_request_id: donationRequestId,
      photo_type: photoType,
      storage_url: signed?.signedUrl || storagePath,
      storage_path: storagePath,
      original_filename: file.name || null,
      mime_type: inspected.mimeType,
      upload_order: uploadOrder,
      file_size_bytes: buffer.length,
      width: inspected.width,
      height: inspected.height,
      sha256: inspected.sha256,
      perceptual_hash: inspected.perceptualHash,
      source_step: 'donation_upload',
      processing_status: 'uploaded',
      admin_review_state: 'pending',
      retention_state: 'active',
    })
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from('donation_requests')
    .update({
      photos_started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      last_completed_step: 'photos_started',
    })
    .eq('id', donationRequestId);

  return row;
}

export async function getDonationPhotoSignedUrl(storagePath, expiresSeconds = 300) {
  const { data, error } = await supabaseAdmin.storage
    .from(DONATION_PHOTO_BUCKET)
    .createSignedUrl(storagePath, expiresSeconds);
  if (error) throw error;
  return data?.signedUrl || null;
}
