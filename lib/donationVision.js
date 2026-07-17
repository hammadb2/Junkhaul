// ============================================================
// DONATION VISION ANALYSIS — real structured image analysis for
// free-donation-pickup screening.
//
// Reuses the project's established vision provider (Gemini 2.0
// Flash, from lib/ai.js) with the same Groq Llama-4-Scout fallback
// used by the booking photo-quote pipeline. This is a SEPARATE
// prompt/schema/provenance trail from lib/ai.js's load-size
// estimator: donation review needs per-item condition/suitability
// detail, not a truck-fill estimate.
//
// If both providers fail, we fall back to the existing rule-based
// analyzeDonationSubmission() (lib/donation.js) so a request never
// gets stuck — but fallback_used=true is recorded so nobody mistakes
// a keyword-only screen for a real vision review.
// ============================================================

import { supabaseAdmin, DONATION_PHOTO_BUCKET } from './supabase';
import { geminiVisionCompletion, groqChatCompletion } from './ai';
import { analyzeDonationSubmission } from './donation';

export const DONATION_VISION_PROMPT_VERSION = 'donation-vision-v1';
export const DONATION_VISION_PRIMARY_PROVIDER = 'gemini';
export const DONATION_VISION_PRIMARY_MODEL = 'gemini-flash-latest';
export const DONATION_VISION_FALLBACK_PROVIDER = 'groq';
export const DONATION_VISION_FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Rough per-token estimates (USD) for cost_usd provenance. Not billing-exact.
const COST_PER_1K_TOKENS = {
  gemini: { input: 0.000075, output: 0.0003 },
  groq: { input: 0.00011, output: 0.00034 },
};

export const DONATION_SUITABILITY_VALUES = ['suitable', 'not_suitable', 'needs_more_evidence', 'needs_manual_review'];
export const DESTINATION_TYPES = ['donation_centre', 'restore', 'charity', 'storage', 'rehaul_inventory', 'recycling', 'landfill'];

const ITEM_SCHEMA_BLOCK = `{
  "items": [
    {
      "category": "furniture|appliance|electronics|mattress|household_goods|other",
      "subtype": "e.g. sofa, dresser, refrigerator, dining table",
      "estimated_dimensions": {"length_in": number, "width_in": number, "height_in": number},
      "estimated_volume_cuft": number,
      "estimated_weight_kg_min": number,
      "estimated_weight_kg_max": number,
      "quantity": integer,
      "material": "e.g. wood, upholstered fabric, metal, plastic, leather",
      "condition": "like_new|good|fair|poor",
      "damage": {"present": boolean, "description": "string or null"},
      "stains": {"present": boolean, "description": "string or null"},
      "tears": {"present": boolean, "description": "string or null"},
      "structural_damage": {"present": boolean, "description": "string or null"},
      "missing_parts": boolean,
      "pest_or_contamination_indicators": ["string"],
      "hazardous_material_indicators": ["string"],
      "donation_suitability": "suitable|not_suitable|needs_more_evidence|needs_manual_review",
      "confidence": number,
      "rejection_reasons": ["string"],
      "additional_photo_requirements": ["string"],
      "recommended_destination_type": "donation_centre|restore|charity|storage|rehaul_inventory|recycling|landfill|null"
    }
  ],
  "overall_confidence": number,
  "overall_suitability": "suitable|not_suitable|needs_more_evidence|needs_manual_review",
  "overall_rejection_reasons": ["string"],
  "overall_additional_photo_requirements": ["string"],
  "notes": "brief internal summary, no customer-identifying commentary"
}`;

function buildPrompt(policy, description) {
  const accepted = (policy?.accepted_categories || []).join(', ') || 'furniture, appliances, electronics, household goods in usable condition';
  const prohibited = (policy?.prohibited_categories || []).join(', ') || 'garbage, construction debris, hazardous materials, heavily soiled items';
  const minCondition = policy?.minimum_condition || 'good';

  return `You are reviewing photos submitted for a FREE donation pickup request (not a paid junk removal quote). Your job is to assess whether the items are genuinely donatable, not to price a job.

Donation policy for this business:
- Accepted categories: ${accepted}
- Prohibited categories: ${prohibited}
- Minimum acceptable condition: ${minCondition}

Customer's own description of the items: "${description || 'none provided'}"

Analyse the photos and return ONLY valid JSON matching this schema, with one entry in "items" per distinct item or item group you can identify:
${ITEM_SCHEMA_BLOCK}

CRITICAL RULES:
- Be conservative. This is a free pickup decision — do not assume good condition or sufficient evidence when the photo does not clearly show it. If unsure, set donation_suitability to "needs_more_evidence" or "needs_manual_review", not "suitable".
- confidence must reflect how certain you are from THIS photo alone (0 = no idea, 1 = certain). Do not report high confidence for a blurry, distant, or partial photo.
- rejection_reasons should be filled whenever donation_suitability is "not_suitable" (e.g. torn upholstery, structural damage, missing parts, visible mold/pests, prohibited category).
- additional_photo_requirements should name the SPECIFIC missing evidence (e.g. "close-up of the tear on the left armrest", "full item view showing all four legs", "photo showing the model/serial label", "wider shot establishing scale/quantity") — never a vague "send more photos".
- Do NOT identify people, faces, mail, documents, or anything privacy-sensitive. Ignore them entirely; never describe them in any field.
- Do NOT hallucinate items not clearly visible.
- recommended_destination_type is your best guess only (e.g. furniture in great condition -> "restore", working small appliance -> "donation_centre", high resale item -> "rehaul_inventory"); it is advisory, not a final destination assignment.
- overall_suitability and overall_confidence should reflect the WHOLE submission (the worst-case item usually drives overall_suitability toward not_suitable/needs_manual_review).

Return ONLY the JSON object, no prose, no markdown fences.`;
}

function parseJson(text) {
  if (!text) throw new Error('Empty AI response');
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(cleaned);
}

function clamp01(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
}

function estimateCostUsd(provider, usage) {
  if (!usage) return null;
  const rates = COST_PER_1K_TOKENS[provider];
  if (!rates) return null;
  const inputTokens = usage.promptTokenCount ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? usage.completion_tokens ?? 0;
  return Number((((inputTokens / 1000) * rates.input) + ((outputTokens / 1000) * rates.output)).toFixed(6));
}

async function downloadPhotosBase64(photos) {
  const out = [];
  for (const photo of photos) {
    if (!photo.storage_path) continue;
    try {
      const { data, error } = await supabaseAdmin.storage.from(DONATION_PHOTO_BUCKET).download(photo.storage_path);
      if (error || !data) continue;
      const buffer = Buffer.from(await data.arrayBuffer());
      out.push({ photo_id: photo.id, photo_type: photo.photo_type, base64: buffer.toString('base64') });
    } catch {
      // Skip unreadable photos; sufficiency check downstream will catch gaps.
    }
  }
  return out;
}

function normalizeItem(raw) {
  const suitability = DONATION_SUITABILITY_VALUES.includes(raw?.donation_suitability) ? raw.donation_suitability : 'needs_manual_review';
  const destinationType = DESTINATION_TYPES.includes(raw?.recommended_destination_type) ? raw.recommended_destination_type : null;
  return {
    category: raw?.category || null,
    subtype: raw?.subtype || null,
    estimated_dimensions: raw?.estimated_dimensions || {},
    estimated_volume_cuft: Number.isFinite(Number(raw?.estimated_volume_cuft)) ? Number(raw.estimated_volume_cuft) : null,
    estimated_weight_kg_min: Number.isFinite(Number(raw?.estimated_weight_kg_min)) ? Number(raw.estimated_weight_kg_min) : null,
    estimated_weight_kg_max: Number.isFinite(Number(raw?.estimated_weight_kg_max)) ? Number(raw.estimated_weight_kg_max) : null,
    quantity: Number.isInteger(raw?.quantity) ? raw.quantity : 1,
    material: raw?.material || null,
    condition: raw?.condition || null,
    damage: raw?.damage || { present: false, description: null },
    stains: raw?.stains || { present: false, description: null },
    tears: raw?.tears || { present: false, description: null },
    structural_damage: raw?.structural_damage || { present: false, description: null },
    missing_parts: Boolean(raw?.missing_parts),
    pest_or_contamination_indicators: Array.isArray(raw?.pest_or_contamination_indicators) ? raw.pest_or_contamination_indicators : [],
    hazardous_material_indicators: Array.isArray(raw?.hazardous_material_indicators) ? raw.hazardous_material_indicators : [],
    donation_suitability: suitability,
    confidence: clamp01(raw?.confidence),
    rejection_reasons: Array.isArray(raw?.rejection_reasons) ? raw.rejection_reasons : [],
    additional_photo_requirements: Array.isArray(raw?.additional_photo_requirements) ? raw.additional_photo_requirements : [],
    recommended_destination_type: destinationType,
  };
}

function deriveOutcome(structured) {
  const items = Array.isArray(structured.items) ? structured.items : [];
  const worstRank = { not_suitable: 3, needs_manual_review: 2, needs_more_evidence: 1, suitable: 0 };
  let overallSuitability = structured.overall_suitability && DONATION_SUITABILITY_VALUES.includes(structured.overall_suitability)
    ? structured.overall_suitability
    : items.reduce((worst, it) => (worstRank[it.donation_suitability] > worstRank[worst] ? it.donation_suitability : worst), 'suitable');

  const outcomeMap = {
    suitable: 'AI_APPROVED',
    needs_more_evidence: 'NEED_MORE_PHOTOS',
    needs_manual_review: 'ADMIN_REVIEW',
    not_suitable: 'OFFER_PAID_JUNK_REMOVAL',
  };

  return {
    outcome: outcomeMap[overallSuitability] || 'ADMIN_REVIEW',
    overall_suitability: overallSuitability,
    confidence: clamp01(structured.overall_confidence) ?? (items.length ? items.reduce((s, it) => s + (it.confidence || 0), 0) / items.length : 0.5),
    rejection_reasons: Array.isArray(structured.overall_rejection_reasons) && structured.overall_rejection_reasons.length
      ? structured.overall_rejection_reasons
      : [...new Set(items.flatMap((it) => it.rejection_reasons))],
    additional_photo_requirements: Array.isArray(structured.overall_additional_photo_requirements) && structured.overall_additional_photo_requirements.length
      ? structured.overall_additional_photo_requirements
      : [...new Set(items.flatMap((it) => it.additional_photo_requirements))],
  };
}

// ------------------------------------------------------------
// analyzeDonationPhotos — the main entry point. Runs real vision
// analysis for a donation request, persists a versioned
// donation_ai_analyses row + per-item donation_request_items rows,
// and returns { analysis, ai_recommendation, items }.
//
// trigger: 'submission' | 'manual_rerun'
// ------------------------------------------------------------
export async function analyzeDonationPhotos({ donationRequestId, description = '', trigger = 'submission', actorId = null }) {
  const startedAt = Date.now();

  const { data: donationRequest, error: reqErr } = await supabaseAdmin
    .from('donation_requests')
    .select('*')
    .eq('id', donationRequestId)
    .single();
  if (reqErr || !donationRequest) throw new Error('Donation request not found');

  const { data: photos } = await supabaseAdmin
    .from('donation_request_photos')
    .select('*')
    .eq('donation_request_id', donationRequestId)
    .is('removed_at', null)
    .order('upload_order', { ascending: true });

  const policy = donationRequest.policy_version_id
    ? (await supabaseAdmin.from('donation_policy_versions').select('*').eq('id', donationRequest.policy_version_id).maybeSingle()).data
    : (await supabaseAdmin.from('donation_policy_versions').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()).data;

  const { data: priorVersions } = await supabaseAdmin
    .from('donation_ai_analyses')
    .select('id, analysis_version')
    .eq('donation_request_id', donationRequestId)
    .order('analysis_version', { ascending: false })
    .limit(1);
  const previousAnalysisId = priorVersions?.[0]?.id || null;
  const nextVersion = (priorVersions?.[0]?.analysis_version || 0) + 1;

  const photoInputs = await downloadPhotosBase64(photos || []);
  const prompt = buildPrompt(policy, description || donationRequest.description);

  let provider = DONATION_VISION_PRIMARY_PROVIDER;
  let model = DONATION_VISION_PRIMARY_MODEL;
  let fallbackUsed = false;
  let failureReason = null;
  let rawOutput = null;
  let structured = null;
  let tokenUsage = null;

  if (photoInputs.length === 0) {
    failureReason = 'no_downloadable_photos';
  } else {
    try {
      const { text, usage } = await geminiVisionCompletion(photoInputs.map((p) => p.base64), prompt, 2000);
      rawOutput = text;
      structured = parseJson(text);
      tokenUsage = usage;
    } catch (geminiErr) {
      console.error('Donation vision: Gemini failed, falling back to Groq:', geminiErr.message);
      failureReason = geminiErr.message;
      try {
        provider = DONATION_VISION_FALLBACK_PROVIDER;
        model = DONATION_VISION_FALLBACK_MODEL;
        fallbackUsed = true;
        const { text, usage } = await groqChatCompletion([
          {
            role: 'user',
            content: [
              ...photoInputs.map((p) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${p.base64}` } })),
              { type: 'text', text: prompt },
            ],
          },
        ], 1500);
        rawOutput = text;
        structured = parseJson(text);
        tokenUsage = usage;
      } catch (groqErr) {
        console.error('Donation vision: Groq fallback also failed:', groqErr.message);
        failureReason = `gemini: ${failureReason}; groq: ${groqErr.message}`;
      }
    }
  }

  let items = [];
  let outcome;
  let ruleBasedFallback = false;

  if (structured) {
    items = (Array.isArray(structured.items) ? structured.items : []).map(normalizeItem);
    outcome = deriveOutcome({ ...structured, items });
  } else {
    // Safe fallback: never leave a submission stuck because both vision
    // providers are down. Falls back to the rule-based keyword/confirmation
    // screen — clearly flagged via fallback_used + a low confidence cap.
    ruleBasedFallback = true;
    fallbackUsed = true;
    provider = 'rule_based_fallback';
    model = 'donation-policy-v1';
    const ruleResult = analyzeDonationSubmission({
      description: description || donationRequest.description || '',
      photos: photos || [],
      confirmations: {
        confirmation_no_garbage: donationRequest.confirmation_no_garbage,
        confirmation_no_hazmat: donationRequest.confirmation_no_hazmat,
        confirmation_items_clean: donationRequest.confirmation_items_clean,
        confirmation_items_usable: donationRequest.confirmation_items_usable,
      },
    });
    outcome = {
      outcome: ruleResult.outcome,
      overall_suitability: ruleResult.outcome === 'ADMIN_REVIEW' ? 'needs_manual_review' : ruleResult.outcome === 'NEED_MORE_PHOTOS' ? 'needs_more_evidence' : 'not_suitable',
      confidence: Math.min(ruleResult.confidence, 0.6),
      rejection_reasons: ruleResult.rejection_reasons || [],
      additional_photo_requirements: ruleResult.missing_photos || [],
    };
    structured = ruleResult.structured_output || {};
    rawOutput = ruleResult;
  }

  const aiRecommendation = {
    outcome: outcome.outcome,
    suitability: outcome.overall_suitability,
    confidence: outcome.confidence,
    rejection_reasons: outcome.rejection_reasons,
    additional_photo_requirements: outcome.additional_photo_requirements,
    source: ruleBasedFallback ? 'rule_based_fallback' : 'vision_model',
  };

  const processingTimeMs = Date.now() - startedAt;
  const costUsd = ruleBasedFallback ? null : estimateCostUsd(provider, tokenUsage);

  const { data: analysisRow, error: insertErr } = await supabaseAdmin
    .from('donation_ai_analyses')
    .insert({
      donation_request_id: donationRequestId,
      provider,
      model,
      prompt_version: DONATION_VISION_PROMPT_VERSION,
      donation_policy_version_id: policy?.id || null,
      raw_output: rawOutput,
      structured_output: structured || {},
      confidence: outcome.confidence,
      item_level_decisions: items,
      rejection_reasons: outcome.rejection_reasons,
      input_photo_ids: photoInputs.map((p) => p.photo_id),
      analysis_version: nextVersion,
      ai_recommendation: aiRecommendation,
      fallback_used: fallbackUsed,
      failure_reason: failureReason,
      cost_usd: costUsd,
      token_usage: tokenUsage,
      processing_time_ms: processingTimeMs,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  if (previousAnalysisId) {
    await supabaseAdmin.from('donation_ai_analyses').update({ superseded_by: analysisRow.id }).eq('id', previousAnalysisId);
  }

  // Replace AI-sourced item rows for this request; preserve any row a human
  // has already corrected (manual_correction present) rather than overwrite it.
  const { data: existingItems } = await supabaseAdmin
    .from('donation_request_items')
    .select('id, manual_correction')
    .eq('donation_request_id', donationRequestId);
  const humanCorrectedIds = new Set((existingItems || []).filter((i) => i.manual_correction).map((i) => i.id));
  const aiSourcedIds = (existingItems || []).filter((i) => !humanCorrectedIds.has(i.id)).map((i) => i.id);
  if (aiSourcedIds.length) {
    await supabaseAdmin.from('donation_request_items').delete().in('id', aiSourcedIds);
  }

  let insertedItems = [];
  if (items.length) {
    const { data: newItems, error: itemsErr } = await supabaseAdmin
      .from('donation_request_items')
      .insert(items.map((item) => ({
        donation_request_id: donationRequestId,
        ai_analysis_id: analysisRow.id,
        name: item.subtype || item.category || 'Item',
        category: item.category,
        subtype: item.subtype,
        quantity: item.quantity,
        condition: item.condition,
        dimensions: item.estimated_dimensions,
        weight_kg: item.estimated_weight_kg_max || item.estimated_weight_kg_min || null,
        weight_kg_min: item.estimated_weight_kg_min,
        weight_kg_max: item.estimated_weight_kg_max,
        volume_cuft: item.estimated_volume_cuft,
        material: item.material,
        damage_flags: { damage: item.damage, stains: item.stains, tears: item.tears, structural_damage: item.structural_damage },
        missing_parts: item.missing_parts,
        pest_contamination_indicators: item.pest_or_contamination_indicators,
        hazmat_indicators: item.hazardous_material_indicators,
        ai_decision: item.donation_suitability,
        suitability: item.donation_suitability,
        confidence: item.confidence,
        rejection_reasons: item.rejection_reasons,
        additional_photo_requirements: item.additional_photo_requirements,
        recommended_destination_type: item.recommended_destination_type,
        destination: item.recommended_destination_type,
      })))
      .select();
    if (itemsErr) throw itemsErr;
    insertedItems = newItems;
  }

  return {
    analysis: analysisRow,
    ai_recommendation: aiRecommendation,
    items: insertedItems,
    fallback_used: fallbackUsed,
    provider,
    model,
  };
}
