import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

// Compute a deterministic hash for an ordered set of base64 photo strings.
// Hash the raw bytes, not the base64 string, so encoding differences don't matter.
export function computePhotoHash(photos_base64) {
  const hash = crypto.createHash('sha256');
  for (const b64 of photos_base64) {
    // Decode base64 to buffer and hash the raw image bytes
    const buffer = Buffer.from(b64, 'base64');
    hash.update(buffer);
    // Add a separator so two small photos don't collide with one large photo
    hash.update(Buffer.from([0xff, 0x00]));
  }
  return hash.digest('hex');
}

// Look up a cached analysis by photo hash.
// Returns null if not found or if the cache table is unavailable (fail silently).
export async function getCachedAnalysis(photoHash) {
  if (!photoHash) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('photo_quote_cache')
      .select('analysis_json, itemized_json, price_json, photo_urls, hit_count')
      .eq('photo_hash', photoHash)
      .maybeSingle();

    if (error || !data) return null;

    // Update last_accessed and increment hit_count (fire and forget).
    // We already fetched hit_count so we can increment it safely.
    const newHitCount = (data.hit_count || 0) + 1;
    supabaseAdmin
      .from('photo_quote_cache')
      .update({ last_accessed: new Date().toISOString(), hit_count: newHitCount })
      .eq('photo_hash', photoHash)
      .then(() => {})
      .catch(() => {});

    return {
      analysis: data.analysis_json,
      itemized: data.itemized_json,
      price: data.price_json,
      photoUrls: data.photo_urls || [],
    };
  } catch (e) {
    console.error('Cache lookup error:', e.message);
    return null;
  }
}

// Write a new cache entry (upsert on photo_hash).
// Fails silently if the cache table is unavailable.
export async function setCachedAnalysis(photoHash, { analysis, itemized, price, photoUrls, phone, sessionId }) {
  if (!photoHash) return;
  try {
    const { error } = await supabaseAdmin
      .from('photo_quote_cache')
      .upsert(
        {
          photo_hash: photoHash,
          phone: phone || null,
          session_id: sessionId || null,
          analysis_json: analysis,
          itemized_json: itemized,
          price_json: price || null,
          photo_urls: photoUrls || [],
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
        },
        { onConflict: 'photo_hash' }
      );

    if (error) console.error('Cache write error:', error.message);
  } catch (e) {
    console.error('Cache write error:', e.message);
  }
}
