// ============================================================
// itemEvidence.js
//
// Guided photo capture and item identity/weight/volume evidence pipeline.
//
// Goals:
// - Identify each item from photos/description and estimate weight/volume.
// - Assign evidence tier A/B/C/D and numeric confidence.
// - Use conservative upper bounds for pricing and routing.
// - Flag hazards, ambiguity, contamination and high-impact items for review.
// - Never describe an inferred value as exact.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { geminiVisionCompletion, groqChatCompletion } from './ai.js';
import { classifyItems } from './disposal.js';

const PROMPT_VERSION = 'item-evidence-v1';

const CATALOG_WEIGHT_KG = {
  sofa: 45, loveseat: 30, sectionals: 80, armchair: 25, recliner: 30,
  coffee_table: 15, dining_table: 35, dining_chair: 8, desk: 25, bookshelf: 20,
  dresser: 35, nightstand: 12, wardrobe: 40, ottoman: 10, futon: 25,
  mattress: 25, box_spring: 20, bed_frame: 20, bunk_bed: 45, headboard: 15,
  fridge: 70, freezer: 60, chest_freezer: 75, air_conditioner: 35, water_cooler: 20,
  dehumidifier: 20, washer: 50, dryer: 50, stove: 50, dishwasher: 40, microwave: 15, water_heater: 45, furnace: 80,
  tv_small: 15, tv_large: 30, computer: 10, monitor: 8, printer: 12, laptop: 3,
  lawn_mower: 30, bbq: 25, patio_table: 20, patio_chair: 8, umbrella: 8, bicycle: 15, trampoline: 50, swing_set: 45, shed: 80, fence_panels: 25,
  drywall: 40, tiles: 35, carpet: 25, lumber: 25, cabinets: 40, vanity: 30, toilet: 25, sink: 15, bathtub: 40, countertop: 30, door: 20, window: 25,
  boxes_small: 15, boxes_medium: 30, boxes_large: 50, garbage_bags: 20, clothing: 15, toys: 15, exercise_equipment: 35, treadmill: 60, piano: 150, safe: 80,
  other_large: 30, other_medium: 15, other_small: 8,
};

const CATALOG_VOLUME_CUFT = {
  sofa: 60, loveseat: 45, sectionals: 100, armchair: 30, recliner: 30,
  coffee_table: 10, dining_table: 25, dining_chair: 5, desk: 20, bookshelf: 18,
  dresser: 25, nightstand: 6, wardrobe: 35, ottoman: 8, futon: 25,
  mattress: 20, box_spring: 16, bed_frame: 18, bunk_bed: 45, headboard: 12,
  fridge: 35, freezer: 30, chest_freezer: 35, air_conditioner: 20, water_cooler: 10,
  dehumidifier: 8, washer: 25, dryer: 25, stove: 25, dishwasher: 20, microwave: 5, water_heater: 20, furnace: 40,
  tv_small: 6, tv_large: 12, computer: 4, monitor: 3, printer: 4, laptop: 1,
  lawn_mower: 12, bbq: 15, patio_table: 20, patio_chair: 6, umbrella: 6, bicycle: 8, trampoline: 80, swing_set: 70, shed: 120, fence_panels: 15,
  drywall: 35, tiles: 25, carpet: 30, lumber: 25, cabinets: 30, vanity: 20, toilet: 12, sink: 6, bathtub: 35, countertop: 20, door: 10, window: 15,
  boxes_small: 10, boxes_medium: 25, boxes_large: 45, garbage_bags: 15, clothing: 10, toys: 10, exercise_equipment: 25, treadmill: 50, piano: 100, safe: 50,
  other_large: 25, other_medium: 12, other_small: 4,
};

const ITEM_KEYWORDS = Object.fromEntries(
  Object.entries({
    sofa: ['sofa', 'couch'],
    loveseat: ['loveseat'],
    sectionals: ['sectional'],
    armchair: ['armchair'],
    recliner: ['recliner'],
    coffee_table: ['coffee table'],
    dining_table: ['dining table'],
    dining_chair: ['dining chair'],
    desk: ['desk'],
    bookshelf: ['bookcase', 'bookshelf'],
    dresser: ['dresser', 'chest of drawers'],
    nightstand: ['nightstand'],
    wardrobe: ['wardrobe', 'armoire'],
    ottoman: ['ottoman', 'footstool'],
    futon: ['futon'],
    mattress: ['mattress'],
    box_spring: ['box spring'],
    bed_frame: ['bed frame'],
    bunk_bed: ['bunk bed'],
    headboard: ['headboard'],
    fridge: ['fridge', 'refrigerator'],
    freezer: ['freezer', 'deep freeze'],
    chest_freezer: ['chest freezer'],
    air_conditioner: ['air conditioner', 'ac unit'],
    water_cooler: ['water cooler'],
    dehumidifier: ['dehumidifier'],
    washer: ['washer', 'washing machine'],
    dryer: ['dryer'],
    stove: ['stove', 'oven'],
    dishwasher: ['dishwasher'],
    microwave: ['microwave'],
    water_heater: ['water heater'],
    furnace: ['furnace'],
    tv_small: ['small tv', 'tv under'],
    tv_large: ['large tv', 'tv 40', 'flat screen'],
    computer: ['desktop computer', 'computer tower'],
    monitor: ['monitor'],
    printer: ['printer'],
    laptop: ['laptop'],
    lawn_mower: ['lawn mower'],
    bbq: ['bbq', 'grill'],
    patio_table: ['patio table'],
    patio_chair: ['patio chair'],
    umbrella: ['patio umbrella'],
    bicycle: ['bicycle', 'bike'],
    trampoline: ['trampoline'],
    swing_set: ['swing set'],
    shed: ['garden shed', 'shed'],
    fence_panels: ['fence panels'],
    drywall: ['drywall', 'gypsum'],
    tiles: ['tiles', 'flooring'],
    carpet: ['carpet', 'underlay'],
    lumber: ['lumber', 'wood'],
    cabinets: ['kitchen cabinets', 'cabinet'],
    vanity: ['bathroom vanity', 'vanity'],
    toilet: ['toilet'],
    sink: ['sink'],
    bathtub: ['bathtub'],
    countertop: ['countertop'],
    door: ['door'],
    window: ['window'],
    boxes_small: ['small load', 'few boxes', 'boxes'],
    boxes_medium: ['medium load', 'several boxes', 'boxes'],
    boxes_large: ['large load', 'many boxes', 'boxes'],
    garbage_bags: ['garbage bags'],
    clothing: ['clothing', 'textiles'],
    toys: ['toys', 'kids items'],
    exercise_equipment: ['exercise equipment'],
    treadmill: ['treadmill'],
    piano: ['piano', 'organ'],
    safe: ['safe'],
    other_large: ['other large'],
    other_medium: ['other medium'],
    other_small: ['other small'],
  }).map(([k, v]) => [k, [...v, k]])
);

export function matchCatalogItem(name) {
  const n = (name || '').toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [key, kws] of Object.entries(ITEM_KEYWORDS)) {
    for (const kw of kws) {
      if (n.includes(kw)) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          best = key;
        }
      }
    }
  }
  return best;
}

function evidenceTier(confidence, hasModelNumber, hasPhysicalMeasurement, hazards) {
  if (hazards && hazards.length > 0) return { tier: 'D', numeric: 0.3, reason: 'hazards or contamination' };
  if (hasPhysicalMeasurement) return { tier: 'A', numeric: 0.92, reason: 'physical measurement' };
  if (hasModelNumber && confidence >= 4) return { tier: 'A', numeric: 0.85, reason: 'exact model documentation' };
  if (hasModelNumber) return { tier: 'B', numeric: 0.72, reason: 'model number with partial confidence' };
  if (confidence >= 4) return { tier: 'B', numeric: 0.68, reason: 'high-confidence visual identification' };
  if (confidence >= 3) return { tier: 'C', numeric: 0.5, reason: 'moderate visual confidence' };
  if (confidence >= 2) return { tier: 'D', numeric: 0.35, reason: 'low visual confidence' };
  return { tier: 'D', numeric: 0.2, reason: 'unknown or insufficient evidence' };
}

export function buildCapturePrompt(stage, existing) {
  const prompts = {
    full_item: 'Take a clear photo of the entire item from a few metres away, with no other clutter blocking it.',
    context: 'Take a wider shot showing the item and its surroundings so we can judge quantity, access and stairs.',
    label: 'Take a close-up of any manufacturer label, model number, serial number or nameplate.',
    damage: 'Take close-up photos of any damage, stains, tears, dents, rust, mould or pest signs.',
    scale: 'Include a known-size reference (ruler, tape measure, or a standard object like a water bottle) next to the item.',
    access: 'Photo the path from the item to the door: hallways, stairs, tight turns, doorway width.',
    contamination: 'Photo any wetness, odour, insects, animal waste, paint, chemicals or unknown substances.',
  };
  const needed = Object.keys(prompts).filter((k) => !existing?.includes(k));
  return needed.map((k) => ({ stage: k, instruction: prompts[k] }));
}

export function detectPhotoIssues(photoMeta = {}) {
  const issues = [];
  if (photoMeta.blur_score !== undefined && photoMeta.blur_score < 0.3) issues.push({ type: 'blur', instruction: 'Retake with a steadier hand or better lighting.' });
  if (photoMeta.glare_score !== undefined && photoMeta.glare_score > 0.7) issues.push({ type: 'glare', instruction: 'Avoid direct light on reflective surfaces; retake at an angle.' });
  if (photoMeta.darkness_score !== undefined && photoMeta.darkness_score > 0.7) issues.push({ type: 'dark', instruction: 'Increase lighting or turn on a light.' });
  return issues;
}

function cleanJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI response is not valid JSON');
  }
}

export async function analyzeItemEvidence({
  bookingId,
  sessionId,
  photosBase64 = [],
  description = '',
  existingCaptureStages = [],
  client = supabaseAdmin,
}) {
  const observation = {
    booking_id: bookingId,
    session_id: sessionId,
    capture_stage: [...existingCaptureStages, photosBase64.length > 0 ? 'full_item' : 'context'],
    status: 'analyzing',
    original_prompt_version: PROMPT_VERSION,
    original_model_output: {},
  };

  const { data: obs, error: obsErr } = await client.from('item_observations').insert(observation).select().single();
  if (obsErr) throw obsErr;

  const capturePrompt = buildCapturePrompt(null, existingCaptureStages);
  const aiText = `You are a junk removal evidence analyst. Analyze the photos and description. Return ONLY a JSON object with this shape (no markdown):
{
  "items": [
    {
      "item_name": "short human name",
      "quantity": 1,
      "category": "furniture|appliance|electronics|construction|mattress|outdoor|misc",
      "material": "wood|metal|plastic|upholstery|mixed|unknown",
      "has_model_number": false,
      "brand": "",
      "condition": "good|fair|poor|unknown",
      "disassembly_required": false,
      "visible_damage": ["scratch", "stain"],
      "hazards": ["none"],
      "weight_kg_estimate": 0,
      "dimensions_cm": {"length": 0, "width": 0, "height": 0},
      "confidence": 1
    }
  ],
  "overall_confidence": 1,
  "missing_views": ["label", "damage", "context"],
  "hazmat_concern": false,
  "contamination_concern": false,
  "access_concern": false
}

Description: ${description || 'none'}`;

  let raw;
  let provider = 'gemini';
  try {
    if (photosBase64.length > 0) {
      const result = await geminiVisionCompletion(photosBase64, aiText, 1200);
      raw = cleanJson(result.text);
    } else {
      provider = 'groq';
      const result = await groqChatCompletion([
        { role: 'system', content: 'You are a junk removal evidence analyst. Return only JSON.' },
        { role: 'user', content: aiText },
      ], 1200);
      raw = cleanJson(result.text);
    }
  } catch (err) {
    // AI outage: mark pending, return recoverable state.
    await client.from('item_observations').update({
      status: 'pending',
      original_model_output: { error: err.message, provider },
    }).eq('id', obs.id);
    return {
      observation_id: obs.id,
      status: 'pending',
      message: 'AI analysis is temporarily unavailable. Your photos are saved; please try again in a moment.',
      next_capture: capturePrompt,
    };
  }

  // Save original model output.
  await client.from('item_observations').update({
    original_model_output: { provider, prompt_version: PROMPT_VERSION, raw },
  }).eq('id', obs.id);

  const items = raw.items || [];
  const hazards = [];
  if (raw.hazmat_concern) hazards.push({ hazard_type: 'hazmat', severity: 'high', description: 'Potential hazardous material detected', requires_manual_review: true });
  if (raw.contamination_concern) hazards.push({ hazard_type: 'contamination', severity: 'high', description: 'Potential contamination detected', requires_manual_review: true });
  if (raw.access_concern) hazards.push({ hazard_type: 'high_impact', severity: 'medium', description: 'Difficult access/egress flagged', requires_manual_review: true });

  for (const it of items) {
    const catalogKey = matchCatalogItem(it.item_name);
    const likelyWeight = it.weight_kg_estimate && it.weight_kg_estimate > 0 ? it.weight_kg_estimate : (CATALOG_WEIGHT_KG[catalogKey || 'other_medium'] || 15);
    const likelyVolume = it.dimensions_cm && it.dimensions_cm.length ?
      (it.dimensions_cm.length * it.dimensions_cm.width * it.dimensions_cm.height) / 28316.8 :
      (CATALOG_VOLUME_CUFT[catalogKey || 'other_medium'] || 12);
    const rangeFactor = 1 + (1 - Math.min(it.confidence || 2, 5) / 5) * 0.6;
    const weightMin = Math.round(likelyWeight / rangeFactor * 10) / 10;
    const weightMax = Math.round(likelyWeight * rangeFactor * 10) / 10;
    const volumeMin = Math.round(likelyVolume / rangeFactor * 10) / 10;
    const volumeMax = Math.round(likelyVolume * rangeFactor * 10) / 10;

    const classified = classifyItems([{ name: it.item_name, quantity: it.quantity || 1 }]);
    const stream = classified[0]?.stream || 'general';

    const tierInfo = evidenceTier(it.confidence || 2, it.has_model_number, false, hazards);

    const { data: candidate } = await client.from('item_candidates').insert({
      observation_id: obs.id,
      item_name: it.item_name,
      normalized_name: catalogKey || it.item_name,
      category: it.category,
      material: it.material,
      match_type: catalogKey ? 'exact' : 'generic',
      confidence: it.confidence || 2,
      rank: 1,
    }).select().single();

    await client.from('item_evidence_sources').insert({
      candidate_id: candidate.id,
      provider,
      prompt_version: PROMPT_VERSION,
      raw_response: { raw: it },
    });

    const { data: estimate } = await client.from('item_estimates').insert({
      observation_id: obs.id,
      candidate_id: candidate.id,
      weight_min_kg: weightMin,
      weight_likely_kg: likelyWeight,
      weight_max_kg: weightMax,
      volume_min_cuft: volumeMin,
      volume_likely_cuft: likelyVolume,
      volume_max_cuft: volumeMax,
      disassembly_required: !!it.disassembly_required,
      evidence_tier: tierInfo.tier,
      numeric_confidence: tierInfo.numeric,
      conservative_weight_kg: weightMax,
      conservative_volume_cuft: volumeMax,
      pricing_stream: stream,
    }).select().single();

    if (it.dimensions_cm) {
      await client.from('item_dimensions').insert({
        estimate_id: estimate.id,
        length_cm: it.dimensions_cm.length || null,
        width_cm: it.dimensions_cm.width || null,
        height_cm: it.dimensions_cm.height || null,
        method: 'inferred',
      });
    }
  }

  if (hazards.length > 0) {
    await client.from('item_hazards').insert(hazards.map((h) => ({ observation_id: obs.id, ...h })));
  }

  // Determine overall status.
  const needsReview = hazards.length > 0 || (raw.overall_confidence || 0) < 3 || (raw.missing_views && raw.missing_views.length > 0);
  const status = needsReview ? 'review_required' : 'complete';

  // Aggregate per observation.
  const { data: estimates } = await client.from('item_estimates').select('*').eq('observation_id', obs.id);
  const totalWeight = estimates.reduce((s, e) => s + Number(e.conservative_weight_kg), 0);
  const totalVolume = estimates.reduce((s, e) => s + Number(e.conservative_volume_cuft), 0);

  await client.from('item_observations').update({ status }).eq('id', obs.id);
  await client.from('bookings').update({
    item_evidence_status: status,
    item_evidence_summary: {
      observation_id: obs.id,
      item_count: estimates.length,
      total_weight_kg: totalWeight,
      total_volume_cuft: totalVolume,
      lowest_tier: estimates.reduce((m, e) => (e.evidence_tier < m ? e.evidence_tier : m), 'A'),
      hazards: hazards.map((h) => h.hazard_type),
      missing_views: raw.missing_views || [],
    },
  }).eq('id', bookingId);

  return {
    observation_id: obs.id,
    status,
    items: estimates,
    hazards,
    next_capture: buildCapturePrompt(raw.missing_views || [], existingCaptureStages),
  };
}

export async function getEvidenceForBooking(bookingId, client = supabaseAdmin) {
  const { data: observations } = await client
    .from('item_observations')
    .select('*, item_candidates(*, item_evidence_sources(*)), item_estimates(*, item_dimensions(*)), item_hazards(*), item_review_decisions(*)')
    .eq('booking_id', bookingId)
    .order('observed_at', { ascending: false });
  return observations || [];
}

export async function recordReviewDecision({
  observationId,
  reviewerId,
  decision,
  corrections = {},
  reason,
  client = supabaseAdmin,
}) {
  const { data } = await client.from('item_review_decisions').insert({
    observation_id: observationId,
    reviewer_id: reviewerId,
    decision,
    corrections,
    reason,
  }).select().single();

  if (decision === 'accept' || decision === 'correct') {
    await client.from('item_observations').update({ status: 'complete' }).eq('id', observationId);
  } else if (decision === 'request_photo') {
    await client.from('item_observations').update({ status: 'pending' }).eq('id', observationId);
  } else if (decision === 'reject') {
    await client.from('item_observations').update({ status: 'review_required' }).eq('id', observationId);
  }
  return data;
}
