import { NextResponse } from 'next/server';
import { analysePhotos, analyseDescription } from '@/lib/ai';
import { calculatePrice, getPricingConfig, checkWeightFlag } from '@/lib/pricing';
import { buildItemizedQuote } from '@/lib/itemPricing';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';

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

export async function POST(req) {
  try {
    const { photos, description } = await req.json();

    // Log what we received for debugging
    console.log('Analyze request:', {
      hasPhotos: Array.isArray(photos) && photos.length > 0,
      photoCount: Array.isArray(photos) ? photos.length : 0,
      hasDescription: !!description,
      groqKeySet: !!process.env.GROQ_API_KEY,
    });

    let analysis;
    let photoUrls = [];

    if (Array.isArray(photos) && photos.length > 0) {
      // Strip any data: prefix the client may have included.
      const clean = photos.map((p) => p.replace(/^data:image\/\w+;base64,/, ''));
      analysis = await analysePhotos(clean);
      // Persist photos in the background-ish (awaited but non-fatal).
      photoUrls = await uploadPhotos(clean);
    } else if (description && description.trim()) {
      analysis = await analyseDescription(description.trim());
    } else {
      return NextResponse.json({ error: 'Provide photos or a description.' }, { status: 400 });
    }

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

    // Build itemized quote with per-item Calgary pricing
    const itemized = buildItemizedQuote(analysis.items_detected, { stairs: 0, same_day: false });

    return NextResponse.json({
      analysis: {
        ...analysis,
        load_size,
        freon_count,
        flag_for_review,
        flag_reason: analysis.flag_reason || (weight.flag ? weight.reason : null),
      },
      price: { low, high, base: priced.base_price, freon_fee: priced.freon_fee },
      itemized,
      photoUrls,
    });
  } catch (err) {
    console.error('Analyze error:', err.message, err.stack);
    return NextResponse.json(
      { error: 'Could not analyse right now. Please pick your load size manually.' },
      { status: 500 }
    );
  }
}
