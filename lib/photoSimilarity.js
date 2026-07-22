// ============================================================
// PHOTO SIMILARITY — perceptual hash storage & lookup per customer.
//
// Stores a perceptual hash (dHash) for each photo upload so that a
// subsequent upload from the same customer can be compared against
// their previous uploads. When a similar photo is found (above the
// similarity threshold), the caller can run a diff-based analysis
// instead of a full re-analysis, locking prices for unchanged items.
//
// All storage/lookup fails silently if the `photo_phashes` table
// does not exist — it must never block a customer from getting a quote.
// ============================================================

import { supabaseAdmin } from './supabase';
import { similarityScore } from './perceptualHash';

// Store a perceptual hash for a customer's photo upload.
// `analysis` and `itemized` are the full AI analysis + itemized quote
// produced for this upload, so a future diff can lock prices for
// unchanged items to their originally quoted amounts.
export async function storePhotoHash({ phone, sessionId, phash, photoHash, analysis, itemized }) {
  try {
    const { error } = await supabaseAdmin
      .from('photo_phashes')
      .upsert(
        {
          phone: phone || null,
          session_id: sessionId || null,
          phash,
          photo_hash: photoHash,
          analysis_json: analysis,
          itemized_json: itemized,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'phone,phash' }
      );
    if (error) console.error('phash store error:', error.message);
  } catch (e) {
    // Table may not exist yet — fail silently.
    console.error('phash store error:', e.message);
  }
}

// Find the most similar previous photo for this customer.
// Returns { phash, analysis_json, itemized_json, photo_hash, created_at, similarity }
// or null if no match above the threshold.
//
// IMPORTANT: never compares photos across different customers — the
// query is always scoped to the same phone (preferred) or session_id.
export async function findSimilarPhoto({ phone, sessionId, phash, threshold = 0.75 }) {
  if (!phone && !sessionId) return null;
  try {
    // Fetch recent photos for this customer (last 10).
    let query = supabaseAdmin
      .from('photo_phashes')
      .select('phash, analysis_json, itemized_json, photo_hash, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (phone) {
      query = query.eq('phone', phone);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    // Find the most similar one above threshold.
    let bestMatch = null;
    let bestScore = 0;
    for (const entry of data) {
      const score = similarityScore(phash, entry.phash);
      if (score > threshold && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestMatch ? { ...bestMatch, similarity: bestScore } : null;
  } catch (e) {
    // Table may not exist yet — fail silently.
    console.error('phash lookup error:', e.message);
    return null;
  }
}
