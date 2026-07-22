// app/api/photo-quote/route.js
//
// PURPOSE
// -------
// Turn a photo into a permanent "image ID" (a SHA-256 hash of the raw bytes),
// use that ID as the cache key, and NEVER let the same image produce two
// different quotes. First time an image is seen -> we scan it with Gemini
// and store the result under its ID. Every time after that -> we just
// return the stored result. No re-scanning, no variance, no drift.
//
// This also separates "what the AI sees" from "what we charge" -- Gemini
// only ever outputs structured facts (items, counts, volume estimate).
// A deterministic function in OUR code turns those facts into a price tier.
// That means even in the rare case Gemini's raw output shifts slightly on
// a fresh (non-cached) image, the pricing math itself is 100% reproducible
// from whatever facts it did return.

import { NextResponse } from 'next/server';
import { supabaseAdmin, PHOTO_BUCKET } from '@/lib/supabase';
import { buildItemizedQuote, checkItemEligibility } from '@/lib/itemPricing';
import { TRUCK_SIZES } from '@/lib/pricingConstants';
import crypto from 'crypto';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fallback chain: if the primary model is deprecated (404) or overloaded
// (503), try the next one. This prevents a single Google-side deprecation
// from taking the entire photo-quote feature down — the exact outage that
// happened when gemini-2.5-flash was cut without warning.
//
// Order: current-gen Lite first (cheapest, $0.25/M input), then current-gen
// full Flash as a capacity fallback, then the "latest" alias as a last
// resort (auto-resolves but could break on future deprecations).
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

// ---------------------------------------------------------------------
// STEP -1: Enhance BEFORE cropping, not after. Sharpening/denoising a
// tile that's already been cut out amplifies artifacts right at the
// seam -- doing it once on the full image first means every crop
// inherits clean, consistent detail. Pure local image processing, no
// API cost at all.
// ---------------------------------------------------------------------
async function enhanceImage(imageBuffer) {
  return sharp(imageBuffer)
    .rotate() // auto-orient using EXIF so crops aren't built on a sideways photo
    .normalize() // auto-contrast -- helps a lot with dim garage/basement lighting
    .sharpen({ sigma: 1.0 }) // recover edge detail phone cameras soften
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ---------------------------------------------------------------------
// STEP 0: Split the image into a 3x3 overlapping grid (9 crops) in
// addition to the full frame. Vision models default to reporting the
// 4-6 most visually prominent objects and silently drop background /
// cluttered detail. A 3x3 grid with 15% overlap forces the model to
// actually look at every region — center, edges, and corners — instead
// of skimming the whole frame once. Each crop is also upscaled 1.5x
// so small/partially-visible items become detectable.
// ---------------------------------------------------------------------
async function buildImageTiles(enhancedBuffer) {
  const img = sharp(enhancedBuffer);
  const meta = await img.metadata();
  const w = meta.width;
  const h = meta.height;

  const overlap = 0.15; // 15% overlap on each side
  const cols = 3;
  const rows = 3;
  const cellW = Math.round(w / cols);
  const cellH = Math.round(h / rows);
  const overlapX = Math.round(cellW * overlap);
  const overlapY = Math.round(cellH * overlap);

  const regions = [];
  const labels = [
    'top_left', 'top_center', 'top_right',
    'mid_left', 'center', 'mid_right',
    'bot_left', 'bot_center', 'bot_right',
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = Math.max(0, col * cellW - overlapX);
      const top = Math.max(0, row * cellH - overlapY);
      const right = Math.min(w, (col + 1) * cellW + overlapX);
      const bottom = Math.min(h, (row + 1) * cellH + overlapY);
      regions.push({
        label: labels[row * cols + col],
        left, top,
        width: right - left,
        height: bottom - top,
      });
    }
  }

  const crops = await Promise.all(
    regions.map(async (r) => {
      const cropW = Math.min(r.width, w - r.left);
      const cropH = Math.min(r.height, h - r.top);
      const cropBuf = await img.clone()
        .extract({
          left: r.left, top: r.top,
          width: cropW,
          height: cropH,
        })
        .resize({ width: Math.round(cropW * 1.5), withoutEnlargement: false })
        .sharpen({ sigma: 0.8 })
        .normalize()
        .jpeg({ quality: 92 })
        .toBuffer();
      return { label: r.label, base64: cropBuf.toString('base64') };
    })
  );

  return crops;
}

// ---------------------------------------------------------------------
// STEP 1: The "algorithm" that assigns the ID
// A cryptographic hash of the exact image bytes. Identical photo file
// always produces the exact same 64-character ID.
// ---------------------------------------------------------------------
function assignImageId(imageBuffer) {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

// ---------------------------------------------------------------------
// STEP 2: Structured, schema-locked scan (only runs on a NEW id)
// temperature 0 + topK 1 + a strict responseSchema = as close to
// deterministic as a single model call gets.
// ---------------------------------------------------------------------
const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    scene_density: {
      type: 'string',
      enum: ['sparse', 'moderate', 'cluttered', 'packed'],
      description: 'How visually dense/cluttered the scene is overall.',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          count: { type: 'integer' },
          est_volume_cuft_each: { type: 'number' },
          est_weight_kg_each: { type: 'number', description: 'Estimated weight of ONE unit in kg. Reason from material + visible size. A standard sofa is ~45kg, a fridge ~70kg, a mattress ~25kg, a bankers box ~15kg, a dining chair ~8kg.' },
          condition: { type: 'string', enum: ['good', 'fair', 'poor'] },
          hazard_flag: { type: 'boolean' },
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          visual_evidence: { type: 'string' },
          source_region: {
            type: 'string',
            enum: ['full_image', 'top_left', 'top_center', 'top_right', 'mid_left', 'center', 'mid_right', 'bot_left', 'bot_center', 'bot_right'],
          },
          freon_evacuation_sticker_visible: {
            type: 'boolean',
            description: 'ONLY meaningful for refrigerant-containing appliances (fridge, freezer, AC unit, dehumidifier, water cooler). True only if you can actually see a technician sticker/tag/label on the unit indicating refrigerant was professionally evacuated/reclaimed. False (default) for every other item, and false if the appliance is present but no such sticker is visible.',
          },
        },
        required: ['label', 'count', 'est_volume_cuft_each', 'est_weight_kg_each', 'condition', 'hazard_flag', 'confidence', 'visual_evidence', 'source_region'],
      },
    },
    reasoning: { type: 'string' },
    total_est_volume_cuft: { type: 'number' },
  },
  required: ['scene_density', 'items', 'reasoning', 'total_est_volume_cuft'],
};

const SCAN_PROMPT = `You are given the SAME photo multiple times: once as the
full image, and again as NINE overlapping close-up crops on a 3x3 grid
(top_left, top_center, top_right, mid_left, center, mid_right, bot_left,
bot_center, bot_right). Each crop is zoomed 1.5x so you can see detail
that is invisible in the full frame. This is deliberate -- cluttered
scenes hide items behind, under, beside, and between other items, and a
single glance at the full image misses most of them.

Your job: produce an EXHAUSTIVE inventory, not just the most obvious
objects. Work region by region:
1. For each of the 9 crops, individually list every distinct object you
   can see in that crop. Look CAREFULLY -- scan every pixel:
   - Items partially visible behind other items (a chair leg poking out,
     a box edge behind a sofa, a tool on a shelf behind paint cans)
   - Items under or stacked beneath other items (something peeking out
     from under a tarp, the corner of a mattress under boxes)
   - Small items that are easy to overlook (buckets, tools, lamps,
     small appliances, bags, loose lumber, pipes, bike helmets)
   - Items in shadows or dark corners -- the crops have been
     contrast-enhanced specifically so you can see into shadows
   - Items visible through doorways or openings to other rooms
   - Count EVERY individual box, bag, bin, or container -- do not lump
     multiple distinct boxes into one line. If you can see 6 separate
     boxes, list 6 boxes.
2. Then merge the nine regional lists into one final item list, removing
   duplicates where the same object appears in two overlapping crops
   (use source_region + position to judge overlap).
3. Rate scene_density honestly first -- if you mark it "cluttered" or
   "packed" but then only return 4-5 items total, that is a contradiction;
   go back and look again before finalizing. A truly cluttered garage
   should have 15-30+ distinct items. A packed one can have 40+.

CRITICAL -- DO NOT SKIP ITEMS. If you can see even 10% of an object
behind something else, LIST IT. If there is a shape that might be an
item but you are not sure, LIST IT with confidence "low" and describe
what you see in visual_evidence. It is far better to over-detect (and
let the customer remove false positives) than to under-detect and miss
a chargeable item.

CATEGORIZATION RULE -- do not guess appliance/brand categories from vague
shape alone. Only label something as a specific known category
(refrigerator, freezer, etc.) if visual_evidence names a concrete
diagnostic feature actually visible in the photo (a door handle, hinge,
compressor coils/grille, control panel, brand plate). If you cannot point
to one of those, use a generic descriptive label instead (e.g. "large tan
cylindrical container, unidentified") and set confidence to "low" -- do
NOT confidently assign a specific appliance category and its associated
fees to something you are only guessing at from silhouette.

FREON EVACUATION STICKER -- for any refrigerant-containing appliance
(fridge, freezer, AC unit, dehumidifier, water cooler), look specifically
for a technician sticker, tag, or label on the unit (often on the back,
side, or compressor area) stating the refrigerant was professionally
evacuated/reclaimed. Only set freon_evacuation_sticker_visible=true if you
can actually see such a sticker with legible or clearly technician-style
markings -- not just because the unit looks old or empty. This is
evidence a human will double-check before waiving any disposal fee, so
false positives cost nothing but false confidence does: when genuinely
unsure, set it to false.

For each item, estimate volume in cubic feet using visible reference
objects in frame (a standard doorway is ~80in tall, a dining chair seat is
~18in high, a bankers box is roughly 1.3 cuft, etc) -- reason from what is
actually visible in THIS photo, not a generic category default. If only
part of an item is visible, estimate the FULL size of the item, not just
the visible portion.

Also estimate weight in kg for each item type (est_weight_kg_each). Reason
from the material and visible size: a fabric sofa is ~45kg, a refrigerator
~70kg, a mattress ~25kg, a bankers box full of papers ~15kg, a wooden
dining chair ~8kg, a tube TV ~30kg, a metal filing cabinet ~50kg. If you
cannot see the material clearly, estimate conservatively (slightly heavy).

Flag any item that looks hazardous (paint cans, propane, chemicals,
anything asbestos-suspect). Also set hazard_flag=true for a WHOLE VEHICLE
or vehicle shell (car, truck, van, motorcycle, ATV, snowmobile, boat,
trailer, RV, golf cart) — landfills do not accept intact vehicles and a
2-person crew cannot lift one into the truck; this is not junk-removal
work. Note in visual_evidence that it is a vehicle, not a hazardous
material, so it is clear why it was excluded.

Also set hazard_flag=true for any single item you estimate at over 100kg
that an ordinary 2-person crew could not carry into a cargo truck without
a dolly, ramp, or specialised equipment (e.g. a full-size safe, a grand
piano, an engine block, poured concrete). Ordinary large furniture
(fridges ~70kg, sofas ~45kg) is fine and should NOT be flagged just for
being bulky — this is specifically for items beyond a safe 2-person lift.

Return ONLY the JSON matching the schema.`;

async function scanImageWithGemini(rawImageBuffer, mimeType) {
  const enhancedBuffer = await enhanceImage(rawImageBuffer);
  const enhancedBase64 = enhancedBuffer.toString('base64');
  const tiles = await buildImageTiles(enhancedBuffer);

  const imageParts = [
    {
      inline_data: { mime_type: 'image/jpeg', data: enhancedBase64 },
    },
    ...tiles.map((t) => ({
      inline_data: { mime_type: 'image/jpeg', data: t.base64 },
    })),
  ];

  // Build the parts array dynamically: full image + 9 labeled crops
  const parts = [{ text: 'FULL IMAGE:' }, imageParts[0]];
  for (const tile of tiles) {
    parts.push({ text: `CROP: ${tile.label}` });
    parts.push(imageParts[tiles.indexOf(tile) + 1]);
  }
  parts.push({ text: SCAN_PROMPT });

  const requestBody = JSON.stringify({
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      temperature: 0,
      topK: 1,
      responseMimeType: 'application/json',
      responseSchema: SCAN_SCHEMA,
    },
  });

  // Try each model in the fallback chain. 404 = deprecated, 503 = overloaded
  // — both are retryable on the next model. Other errors (400, 500) are real
  // failures and should throw immediately.
  let lastError;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      }
    );

    if (res.ok) {
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error(`Gemini (${model}) returned no structured output`);
      const parsed = JSON.parse(raw);

      const dedupedItems = dedupeItems(parsed.items);
      const recomputedVolume = dedupedItems.reduce(
        (sum, i) => sum + i.est_volume_cuft_each * i.count, 0
      );

      return {
        ...parsed,
        items: dedupedItems,
        total_est_volume_cuft: recomputedVolume,
        _model_used: model,
      };
    }

    const errBody = await res.text();
    lastError = new Error(`Gemini scan failed (${model}): ${res.status} ${errBody.slice(0, 200)}`);

    // 404 (deprecated) or 503 (overloaded) → try next model in the chain.
    // Anything else (400 bad request, 401 auth, 429 rate limit) → throw now.
    if (res.status !== 404 && res.status !== 503) {
      throw lastError;
    }
    console.warn(`photo-quote: model ${model} returned ${res.status}, trying fallback...`);
  }

  // All models in the chain failed.
  throw lastError;
}

// ---------------------------------------------------------------------
// STEP 2.5: Deterministic dedupe -- same label + adjacent/overlapping
// source_regions = one physical object (keep higher-confidence entry).
// Same label + non-adjacent regions = genuinely separate, counts summed.
// ---------------------------------------------------------------------
const REGION_ADJACENCY = {
  full_image: ['top_left', 'top_center', 'top_right', 'mid_left', 'center', 'mid_right', 'bot_left', 'bot_center', 'bot_right'],
  // 3x3 grid: each region overlaps with its 8 neighbors (15% overlap)
  top_left:    ['top_center', 'mid_left', 'center', 'full_image'],
  top_center:  ['top_left', 'top_right', 'mid_left', 'center', 'mid_right', 'full_image'],
  top_right:   ['top_center', 'center', 'mid_right', 'full_image'],
  mid_left:    ['top_left', 'top_center', 'center', 'bot_left', 'bot_center', 'full_image'],
  center:      ['top_left', 'top_center', 'top_right', 'mid_left', 'mid_right', 'bot_left', 'bot_center', 'bot_right', 'full_image'],
  mid_right:   ['top_center', 'top_right', 'center', 'bot_center', 'bot_right', 'full_image'],
  bot_left:    ['mid_left', 'center', 'bot_center', 'full_image'],
  bot_center:  ['mid_left', 'center', 'mid_right', 'bot_left', 'bot_right', 'full_image'],
  bot_right:   ['center', 'mid_right', 'bot_center', 'full_image'],
};

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/s\b/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function regionsOverlap(a, b) {
  return a === b || (REGION_ADJACENCY[a] || []).includes(b);
}

function dedupeItems(rawItems) {
  const groups = new Map();
  for (const item of rawItems) {
    const key = normalizeLabel(item.label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const deduped = [];
  const confidenceRank = { high: 3, medium: 2, low: 1 };

  for (const [, group] of groups) {
    const clusters = [];
    for (const item of group) {
      let placed = false;
      for (const cluster of clusters) {
        if (cluster.some((c) => regionsOverlap(c.source_region, item.source_region))) {
          cluster.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([item]);
    }

    for (const cluster of clusters) {
      const best = cluster.reduce((a, b) =>
        (confidenceRank[b.confidence] ?? 0) > (confidenceRank[a.confidence] ?? 0) ? b : a
      );
      deduped.push({
        ...best,
        merged_from_regions: cluster.map((c) => c.source_region),
      });
    }
  }

  return deduped;
}

// ---------------------------------------------------------------------
// STEP 3: Deterministic pricing — volume → tier → price range.
// ---------------------------------------------------------------------
const TIERS = [
  { name: 'single_item', maxVolume: 15, price: [99, 150] },
  { name: 'quarter_load', maxVolume: 60, price: [160, 300] },
  { name: 'half_load', maxVolume: 130, price: [240, 500] },
  { name: 'full_load', maxVolume: Infinity, price: [500, 900] },
];

// Map the photo-quote tier name to the booking system's load_size key.
const TIER_TO_LOAD_SIZE = {
  single_item: 'single_item',
  quarter_load: 'quarter',
  half_load: 'half',
  full_load: 'full',
};

function computeTier(scanResult) {
  const volume = scanResult.total_est_volume_cuft;
  const hazard = scanResult.items.some((i) => i.hazard_flag);
  const needsConfirmation = scanResult.items.filter(
    (i) => i.confidence === 'low' || (i.confidence === 'medium' && i.hazard_flag)
  );
  const lowItemCountForDensity =
    ['cluttered', 'packed'].includes(scanResult.scene_density) && scanResult.items.length < 8;

  const tier = TIERS.find((t) => volume <= t.maxVolume) ?? TIERS[TIERS.length - 1];
  return {
    tier: tier.name,
    load_size: TIER_TO_LOAD_SIZE[tier.name],
    price_low: tier.price[0],
    price_high: tier.price[1],
    hazard_review_required: hazard,
    total_est_volume_cuft: volume,
    items_needing_confirmation: needsConfirmation.map((i) => ({
      label: i.label,
      confidence: i.confidence,
      visual_evidence: i.visual_evidence,
    })),
    low_confidence_total: lowItemCountForDensity,
  };
}

// ---------------------------------------------------------------------
// STEP 4: Process ONE image -- cache check, or scan-and-store on miss.
// Also uploads the original photo to Supabase storage for the booking record.
// ---------------------------------------------------------------------
async function processOneImage(imageBase64, mimeType) {
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const imageId = assignImageId(imageBuffer);

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('image_quotes')
    .select('*')
    .eq('image_id', imageId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    return { image_id: imageId, cached: true, scan: existing.scan_result };
  }

  const scanResult = await scanImageWithGemini(imageBuffer, mimeType || 'image/jpeg');

  const { error: insertError } = await supabaseAdmin.from('image_quotes').insert({
    image_id: imageId,
    scan_result: scanResult,
    quote_result: null,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: winner } = await supabaseAdmin.from('image_quotes').select('*').eq('image_id', imageId).single();
      return { image_id: imageId, cached: true, scan: winner.scan_result };
    }
    throw insertError;
  }

  return { image_id: imageId, cached: false, scan: scanResult };
}

// ---------------------------------------------------------------------
// STEP 5: Aggregate multiple photos of the SAME booking into one quote.
// ---------------------------------------------------------------------
function aggregateBookingQuote(perImageResults) {
  const allItems = [];
  for (const result of perImageResults) {
    for (const item of result.scan.items) {
      allItems.push({ ...item, source_image_id: result.image_id });
    }
  }

  const labelToImages = new Map();
  for (const item of allItems) {
    const key = normalizeLabel(item.label);
    if (!labelToImages.has(key)) labelToImages.set(key, new Set());
    labelToImages.get(key).add(item.source_image_id);
  }

  const possibleCrossPhotoDuplicates = [...labelToImages.entries()]
    .filter(([, imageIds]) => imageIds.size > 1)
    .map(([label]) => label);

  const totalVolume = allItems.reduce((sum, i) => sum + i.est_volume_cuft_each * i.count, 0);
  const anySceneCluttered = perImageResults.some((r) =>
    ['cluttered', 'packed'].includes(r.scan.scene_density)
  );

  const quote = computeTier({
    total_est_volume_cuft: totalVolume,
    items: allItems,
    scene_density: anySceneCluttered ? 'cluttered' : 'moderate',
  });

  return {
    ...quote,
    photos_scanned: perImageResults.length,
    possible_cross_photo_duplicates: possibleCrossPhotoDuplicates,
  };
}

// ---------------------------------------------------------------------
// Upload photos to Supabase storage and return public URLs.
// ---------------------------------------------------------------------
async function uploadPhotos(images) {
  const urls = [];
  for (const { imageBase64 } of images) {
    try {
      const buffer = Buffer.from(imageBase64, 'base64');
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
    } catch (err) {
      console.error('Photo upload error:', err.message);
    }
  }
  return urls;
}

// ---------------------------------------------------------------------
// STEP 6: The route -- accepts one image OR an array of images for the
// same booking. Each image is independently cached by its own ID; the
// booking-level quote is computed once all photos are processed.
//
// Response includes both the raw `quote` (new format) and a mapped
// `analysis` object (compatible with the existing booking page which
// expects { load_size, has_freon, items_detected, ... }).
// ---------------------------------------------------------------------
export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Photo quoting is not configured (GEMINI_API_KEY missing). Please pick your load size manually.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const images = Array.isArray(body.images)
      ? body.images
      : body.imageBase64
        ? [{ imageBase64: body.imageBase64, mimeType: body.mimeType }]
        : null;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'images (array) or imageBase64 required' }, { status: 400 });
    }

    // Strip any data: prefix the client may have included.
    const cleanImages = images.map((img) => ({
      ...img,
      imageBase64: (img.imageBase64 || '').replace(/^data:image\/\w+;base64,/, ''),
    }));

    const perImageResults = [];
    for (const { imageBase64, mimeType } of cleanImages) {
      perImageResults.push(await processOneImage(imageBase64, mimeType));
    }

    const bookingQuote = aggregateBookingQuote(perImageResults);

    // Upload photos to Supabase storage for the booking record.
    const photoUrls = await uploadPhotos(cleanImages);

    // Build a compatibility `analysis` object so the existing booking
    // page can consume the response without a major refactor.
    const allItems = perImageResults.flatMap((r) => r.scan.items);
    const freonRegex = /refrigerator|freezer|fridge|air conditioner|ac unit|water cooler|dehumidifier/i;
    const hasFreon = allItems.some((i) => freonRegex.test(i.label));
    const freonCount = allItems.filter((i) => freonRegex.test(i.label)).reduce((sum, i) => sum + i.count, 0);
    // "Photo evidence of evacuation sticker" — not just a yes/no toggle.
    // The freon fee is ALWAYS charged regardless of this claim (never a
    // silent discount from an unverified AI read of a phone photo); a
    // sticker the model reports seeing only flags the booking for a
    // human to double-check against the actual photo, which can then
    // credit the fee back if genuinely verified. See create-booking's
    // freon_evacuation_status handling.
    const freonEvacuationClaimed = allItems.some(
      (i) => freonRegex.test(i.label) && i.freon_evacuation_sticker_visible === true
    );

    // Map Gemini scan items to the shape buildItemizedQuote expects, and run
    // the deterministic eligibility gate (whole vehicles + anything a
    // 2-person crew can't safely lift) — this is enforced in code, not just
    // asked of the model, so a prompt/model change can't quietly let a car
    // or a 300kg safe back into a priced quote. See checkItemEligibility in
    // lib/itemPricing.js.
    const itemsForQuote = allItems.map((i) => {
      const estimatedWeightKg = i.est_weight_kg_each || Math.round((i.est_volume_cuft_each || 20) * 0.45);
      const eligibility = checkItemEligibility(i.label, estimatedWeightKg);
      return {
        name: i.label,
        quantity: i.count,
        is_freon: freonRegex.test(i.label),
        is_hazmat: i.hazard_flag || eligibility.rejected,
        estimated_weight_kg: estimatedWeightKg,
      };
    });

    const itemized = buildItemizedQuote(itemsForQuote, { stairs: 0, same_day: false });
    const rejectedItems = itemized.rejected_items || [];
    const hasHazmat = allItems.some((i) => i.hazard_flag) || rejectedItems.length > 0;

    // Total weight/volume for TRUCK SIZING only counts items we're actually
    // taking — a rejected vehicle or an over-weight single item doesn't get
    // to inflate the truck recommendation for junk we're not loading.
    // itemized.items is a 1:1, same-order mapping of itemsForQuote/allItems
    // (buildItemizedQuote maps items_detected positionally), so index into
    // it directly rather than matching by name (two different photos can
    // both detect a "sofa" — matching by label would wrongly conflate them).
    const acceptedForSizing = allItems.filter((_, idx) => !itemized.items[idx]?.rejected);
    const totalWeightKg = acceptedForSizing.reduce((sum, i) => {
      const perUnit = i.est_weight_kg_each || Math.round((i.est_volume_cuft_each || 20) * 0.45);
      return sum + perUnit * i.count;
    }, 0);
    const totalWeightLbs = Math.round(totalWeightKg * 2.20462);
    const totalVolumeCuft = acceptedForSizing.reduce((sum, i) => sum + (i.est_volume_cuft_each || 0) * i.count, 0);

    // Recommend the smallest truck that handles BOTH volume and weight.
    // 15ft: 764 cuft / 6385 lbs  |  20ft: 1016 cuft / 5700 lbs  |  26ft: 1682 cuft / 12859 lbs
    // Note: 20ft carries LESS weight than 15ft (heavier truck body).
    // So if weight > 5700 lbs, skip 20ft and go straight to 26ft.
    let recommendedTruckSize = 15;
    if (totalVolumeCuft > TRUCK_SIZES[15].volume_cuft || totalWeightLbs > TRUCK_SIZES[15].max_load_lbs) {
      if (totalWeightLbs > TRUCK_SIZES[20].max_load_lbs || totalVolumeCuft > TRUCK_SIZES[20].volume_cuft) {
        recommendedTruckSize = 26;
      } else {
        recommendedTruckSize = 20;
      }
    }
    // Even the largest truck we operate can't take this in one trip —
    // don't silently cap at 26ft, flag it so a human plans a multi-trip job.
    const exceedsMaxTruckCapacity =
      totalWeightLbs > TRUCK_SIZES[26].max_load_lbs || totalVolumeCuft > TRUCK_SIZES[26].volume_cuft;

    const analysis = {
      load_size: bookingQuote.load_size,
      has_freon: hasFreon,
      freon_count: freonCount,
      freon_evacuation_claimed: freonEvacuationClaimed,
      freon_evacuation_status: freonEvacuationClaimed ? 'pending_review' : 'not_claimed',
      has_hazmat: hasHazmat,
      hazmat_description: hasHazmat
        ? [...allItems.filter((i) => i.hazard_flag).map((i) => i.label), ...rejectedItems.map((i) => i.note)].join('; ')
        : null,
      rejected_items: rejectedItems.map((i) => ({ name: i.original_name, reason: i.note })),
      flag_for_review: bookingQuote.hazard_review_required || bookingQuote.low_confidence_total || exceedsMaxTruckCapacity,
      flag_reason: exceedsMaxTruckCapacity
        ? `Load exceeds our largest truck's capacity (${TRUCK_SIZES[26].max_load_lbs} lbs / ${TRUCK_SIZES[26].volume_cuft} cuft) — needs a multi-trip plan, not a standard job.`
        : bookingQuote.low_confidence_total
          ? 'Scene rated cluttered/packed but few items detected — possible undercount'
          : bookingQuote.hazard_review_required
            ? 'Hazardous items detected'
            : null,
      exceeds_max_truck_capacity: exceedsMaxTruckCapacity,
      items_detected: itemsForQuote,
      estimated_volume_cuft: totalVolumeCuft,
      estimated_weight_kg: totalWeightKg,
      estimated_weight_lbs: totalWeightLbs,
      estimated_dump_fee: itemized.estimated_dump_fee,
      recommended_truck_size: recommendedTruckSize,
      photo_quote_tier: bookingQuote.tier,
      items_needing_confirmation: bookingQuote.items_needing_confirmation,
      possible_cross_photo_duplicates: bookingQuote.possible_cross_photo_duplicates,
      confidence: bookingQuote.low_confidence_total ? 'low' : 'high',
    };

    return NextResponse.json({
      images: perImageResults.map((r) => ({ image_id: r.image_id, cached: r.cached })),
      quote: bookingQuote,
      analysis,
      itemized,
      photoUrls,
    });
  } catch (err) {
    console.error('photo-quote error:', err);
    return NextResponse.json(
      { error: 'Could not analyse photos right now. Please pick your load size manually.' },
      { status: 500 }
    );
  }
}
