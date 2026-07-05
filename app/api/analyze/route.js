import { NextResponse } from 'next/server';
import { analysePhotos, analyseDescription } from '@/lib/ai';
import { calculatePrice, PRICING, checkWeightFlag } from '@/lib/pricing';
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

    const weight = checkWeightFlag(load_size, analysis.estimated_weight_kg);
    const flag_for_review = Boolean(analysis.flag_for_review) || weight.severity === 'hard';

    // Price range shown in the bottom sheet: base .. base+same-day.
    const priced = calculatePrice({ load_size, has_freon: analysis.has_freon });
    const low = priced.total;
    const high = priced.total + PRICING.same_day;

    return NextResponse.json({
      analysis: {
        ...analysis,
        load_size,
        flag_for_review,
        flag_reason: analysis.flag_reason || (weight.flag ? weight.reason : null),
      },
      price: { low, high, base: priced.base_price },
      photoUrls,
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json(
      { error: 'Could not analyse right now. Please pick your load size manually.' },
      { status: 500 }
    );
  }
}
