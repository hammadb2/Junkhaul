import { NextResponse } from 'next/server';
import {
  analysePhotos,
  analysePhotoDiff,
  analyseDescription,
  handleSafetyAlert,
  stripInternalFields,
} from '@/lib/ai';
import { calculatePrice, getPricingConfig, checkWeightFlag } from '@/lib/pricing';
import { buildItemizedQuote, matchItemToCatalog, recalcWithDisposal, checkItemEligibility } from '@/lib/itemPricing';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';
import { computePhotoHash, getCachedAnalysis, setCachedAnalysis } from '@/lib/photoCache';
import { computeDHash } from '@/lib/perceptualHash';
import { storePhotoHash, findSimilarPhoto } from '@/lib/photoSimilarity';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Upload base64 photos to Supabase storage, return public URLs.
async function uploadPhotos(photos_base64) {
  const urls = [];
  for (const b64 of photos_base64) {
    const buffer = Buffer.from(b64, 'base64');
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      console.error('Photo upload failed:', error.message);
      continue;
    }
    const { data } = supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// Download photos from public URLs and return them as base64 strings.
// Used to re-fetch a customer's previous upload so the vision model can
// compare old vs new. Failures for individual URLs are skipped silently.
async function fetchPhotosAsBase64(urls) {
  const results = [];
  for (const url of urls || []) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      results.push(buf.toString('base64'));
    } catch (e) {
      console.error('fetch old photo failed:', e.message);
    }
  }
  return results;
}

// Merge a photo-diff result with the previous itemized quote.
//
// Prices for UNCHANGED items are locked to their originally quoted
// amounts (taken from previousItemized). Only genuinely NEW items are
// priced fresh via the catalog. REMOVED items are dropped. The result
// has the same shape as a normal itemized quote (items, subtotal,
// stairs_fee, same_day_fee, total, is_minimum, ...).
function mergeDiffItemized(diffResult, previousItemized) {
  const prevItems = (previousItemized && Array.isArray(previousItemized.items)) ? previousItemized.items : [];

  // Start with unchanged items — lock their original prices.
  let mergedItems = (diffResult.unchanged_items || []).map((item) => {
    const prevItem = prevItems.find(
      (p) => p.name === item.name || p.original_name === item.name
    );
    if (prevItem) {
      // Keep the previous price; only update quantity if the diff says so.
      return { ...prevItem, quantity: item.quantity || prevItem.quantity };
    }
    // Fallback: price fresh if we can't find the previous entry.
    const catalogMatch = matchItemToCatalog(item.name);
    const eligibility = checkItemEligibility(item.name, item.estimated_weight_kg || catalogMatch?.avg_kg);
    const quantity = item.quantity || 1;
    const isHazmat = item.is_hazmat || false || eligibility.rejected;
    const unitPrice = isHazmat ? 0 : (catalogMatch?.price || 25);
    return {
      name: catalogMatch?.is_fallback ? item.name : (catalogMatch?.name || item.name),
      original_name: item.name,
      key: catalogMatch?.key || 'other_medium',
      quantity,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      category: catalogMatch?.category || 'misc',
      is_freon: item.is_freon || catalogMatch?.category === 'freon',
      is_hazmat: isHazmat,
      donatable: catalogMatch?.donatable ?? true,
      avg_kg: catalogMatch?.avg_kg || item.estimated_weight_kg || 20,
      note: eligibility.rejected ? eligibility.reason : (catalogMatch?.note || null),
      rejected: eligibility.rejected,
      disposal: eligibility.rejected ? 'not_accepted' : 'dump',
    };
  });

  // Add new items — price them fresh.
  for (const added of diffResult.added_items || []) {
    const catalogMatch = matchItemToCatalog(added.name);
    const eligibility = checkItemEligibility(added.name, added.estimated_weight_kg || catalogMatch?.avg_kg);
    const quantity = added.quantity || 1;
    const isHazmat = added.is_hazmat || false || eligibility.rejected;
    const unitPrice = isHazmat ? 0 : (catalogMatch?.price || 25);
    mergedItems.push({
      name: catalogMatch?.is_fallback ? added.name : (catalogMatch?.name || added.name),
      original_name: added.name,
      key: catalogMatch?.key || 'other_medium',
      quantity,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      category: catalogMatch?.category || 'misc',
      is_freon: added.is_freon || catalogMatch?.category === 'freon',
      is_hazmat: isHazmat,
      donatable: catalogMatch?.donatable ?? true,
      avg_kg: catalogMatch?.avg_kg || added.estimated_weight_kg || 20,
      note: eligibility.rejected ? eligibility.reason : (catalogMatch?.note || null),
      rejected: eligibility.rejected,
      disposal: eligibility.rejected ? 'not_accepted' : 'dump',
    });
  }

  // Remove removed items (match by name or original_name).
  const removed = diffResult.removed_items || [];
  mergedItems = mergedItems.filter(
    (item) => !removed.some((r) => r.name === item.name || r.name === item.original_name)
  );

  // Recalculate totals with the same shape as a normal itemized quote.
  return recalcWithDisposal(mergedItems, { stairs: 0, same_day: false });
}

export async function POST(req) {
  try {
    const { photos, description, phone, sessionId } = await req.json();

    // Log what we received for debugging
    console.log('Analyze request:', {
      hasPhotos: Array.isArray(photos) && photos.length > 0,
      photoCount: Array.isArray(photos) ? photos.length : 0,
      hasDescription: !!description,
      groqKeySet: !!process.env.GROQ_API_KEY,
    });

    let analysis;
    let photoUrls = [];
    // When the diff path is used, we build the itemized quote directly
    // from the merged item list instead of buildItemizedQuote.
    let diffItemized = null;
    let usedDiff = false;
    // Representative perceptual hash for this upload (stored later).
    let phash = null;

    if (Array.isArray(photos) && photos.length > 0) {
      // Strip any data: prefix the client may have included.
      const clean = photos.map((p) => p.replace(/^data:image\/\w+;base64,/, ''));

      // 1. Compute deterministic hash and check the photo quote cache.
      //    Same photos → same quote (saves LLM cost + time on repeat uploads).
      const photoHash = computePhotoHash(clean);
      const cached = await getCachedAnalysis(photoHash);
      if (cached) {
        console.log('Photo cache HIT:', photoHash.slice(0, 12));
        return NextResponse.json({
          analysis: cached.analysis,
          itemized: cached.itemized,
          price: cached.price,
          photoUrls: cached.photoUrls,
          cached: true,
        });
      }

      // 2. Cache miss — try perceptual-hash similarity detection.
      //    If this customer has uploaded a similar photo before, run a
      //    diff analysis that locks prices for unchanged items instead
      //    of a full re-analysis. The entire diff flow is wrapped in
      //    try/catch — any failure falls back to normal analysePhotos
      //    so the customer is never blocked from getting a quote.
      try {
        if (phone || sessionId) {
          // Compute a perceptual hash from the first (primary) photo.
          phash = await computeDHash(Buffer.from(clean[0], 'base64'));

          // 3. Look up similar previous photos for this customer.
          //    Scoped per-customer — never compared across customers.
          const similar = await findSimilarPhoto({ phone, sessionId, phash });
          if (similar) {
            console.log(
              'Similar photo found (similarity:',
              similar.similarity.toFixed(2),
              ') — running diff analysis'
            );

            // 4a. Fetch the old photos from storage. The phash entry
            //     stores the SHA-256 photo_hash; look that up in the
            //     quote cache to get the stored photo URLs.
            const { data: cacheEntry } = await supabaseAdmin
              .from('photo_quote_cache')
              .select('photo_urls')
              .eq('photo_hash', similar.photo_hash)
              .maybeSingle();
            const oldUrls = (cacheEntry && cacheEntry.photo_urls) || [];
            const oldPhotosB64 = await fetchPhotosAsBase64(oldUrls);

            if (oldPhotosB64.length > 0) {
              // 4b. Ask the vision model what's DIFFERENT.
              const diffResult = await analysePhotoDiff(
                clean,
                oldPhotosB64,
                similar.analysis_json
              );

              if (diffResult && !diffResult.photo_unusable) {
                // 4c/4d. Merge: lock unchanged prices, price new items,
                //        drop removed items.
                diffItemized = mergeDiffItemized(diffResult, similar.itemized_json);

                // Build a synthetic items_detected (current state =
                // unchanged + added) so downstream code and the client
                // see the full current item list.
                analysis = {
                  ...diffResult,
                  items_detected: [
                    ...(diffResult.unchanged_items || []),
                    ...(diffResult.added_items || []),
                  ],
                };
                usedDiff = true;
                console.log('Diff analysis succeeded — prices locked for unchanged items');
              }
            }
          }
        }
      } catch (diffErr) {
        // Never block the customer — fall back to normal analysis.
        console.error('Diff analysis failed, falling back to normal:', diffErr.message);
        usedDiff = false;
        diffItemized = null;
      }

      // 5. If no similar photo (or diff failed), proceed with normal analysis.
      if (!usedDiff) {
        analysis = await analysePhotos(clean);
      }

      // Persist photos in the background-ish (awaited but non-fatal).
      photoUrls = await uploadPhotos(clean);
    } else if (description && description.trim()) {
      analysis = await analyseDescription(description.trim());
    } else {
      return NextResponse.json({ error: 'Provide photos or a description.' }, { status: 400 });
    }

    // Photo unusable (e.g. intimate content accidentally in frame) — tell the
    // customer to retake without ever describing why. No analysis, no price.
    if (analysis.photo_unusable) {
      return NextResponse.json({
        photo_unusable: true,
        error: 'Photo unusable — please retake your photo and try again.',
      });
    }

    // Safety alert: route privately to the operator (SMS + internal DB log),
    // then strip it from the response so it never reaches the customer.
    await handleSafetyAlert(analysis, { source: 'web', photo_urls: photoUrls });

    const load_size = ['single_item', 'quarter', 'half', 'full'].includes(analysis.load_size)
      ? analysis.load_size
      : 'quarter';

    const pricingConfig = await getPricingConfig();
    const weight = checkWeightFlag(load_size, analysis.estimated_weight_kg, pricingConfig);
    const flag_for_review = Boolean(analysis.flag_for_review) || weight.severity === 'hard';

    // Price range shown in the bottom sheet: base .. base+same-day.
    const freon_count = analysis.freon_count || (analysis.has_freon ? 1 : 0);
    const priced = calculatePrice({ load_size, has_freon: analysis.has_freon, freon_count, pricingConfig });
    const low = priced.total;
    const high = priced.total + pricingConfig.same_day;

    // Build itemized quote. For the diff path, use the merged quote
    // (with locked prices for unchanged items). Otherwise build fresh.
    const itemized = usedDiff && diffItemized
      ? diffItemized
      : buildItemizedQuote(analysis.items_detected, { stairs: 0, same_day: false });

    const responseData = {
      analysis: stripInternalFields({
        ...analysis,
        load_size,
        freon_count,
        flag_for_review,
        flag_reason: analysis.flag_reason || (weight.flag ? weight.reason : null),
      }),
      price: { low, high, base: priced.base_price, freon_fee: priced.freon_fee },
      itemized,
      photoUrls,
    };

    // Write to cache (only for photo-based analyses) so the same photos
    // produce the same quote on subsequent requests. Failures are silent.
    if (Array.isArray(photos) && photos.length > 0) {
      const clean = photos.map((p) => p.replace(/^data:image\/\w+;base64,/, ''));
      const photoHash = computePhotoHash(clean);
      await setCachedAnalysis(photoHash, {
        analysis: responseData.analysis,
        itemized: responseData.itemized,
        price: responseData.price,
        photoUrls,
        phone: phone || null,
        sessionId: sessionId || null,
      });

      // 6. Store the perceptual hash for this customer so future uploads
      //    can be compared. Fails silently if the table doesn't exist.
      if (phash && (phone || sessionId)) {
        await storePhotoHash({
          phone,
          sessionId,
          phash,
          photoHash,
          analysis: responseData.analysis,
          itemized: responseData.itemized,
        });
      }
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error('Analyze error:', err.message, err.stack);
    return NextResponse.json(
      { error: 'Could not analyse right now. Please pick your load size manually.' },
      { status: 500 }
    );
  }
}
