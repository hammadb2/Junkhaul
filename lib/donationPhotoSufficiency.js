// ============================================================
// DONATION PHOTO SUFFICIENCY
//
// Decides whether the photos submitted for a donation request give
// the vision pipeline (lib/donationVision.js) enough evidence for a
// reliable decision, and — if not — sends a SPECIFIC Quo photo
// request naming the exact missing evidence (never a vague "send
// more photos").
// ============================================================

import { supabaseAdmin } from './supabase';
import { sendSMS } from './sms';
import { recordTimelineEvent } from './timeline';
import { validateDonationPhotos, REQUIRED_DONATION_PHOTO_TYPES } from './donation';

export const PHOTO_SUFFICIENCY_STATUSES = ['sufficient', 'more_photos_required', 'manual_review_required', 'automatic_rejection'];

export const MISSING_EVIDENCE_REASONS = {
  MISSING_FULL_ITEM_VIEW: 'missing_full_item_view',
  MISSING_DAMAGE_CLOSE_UP: 'missing_damage_close_up',
  SCALE_UNCLEAR: 'scale_unclear',
  QUANTITY_UNCLEAR: 'quantity_unclear',
  MODEL_LABEL_MISSING: 'model_label_missing',
  ACCESS_PATH_UNCLEAR: 'access_path_unclear',
  LOAD_CONTEXT_MISSING: 'load_context_missing',
  CONTAMINATION_UNCLEAR: 'contamination_unclear',
};

const EVIDENCE_MESSAGES = {
  missing_full_item_view: 'a full view of the whole item from a few feet back',
  missing_damage_close_up: 'a close-up photo of any damage, stains, or tears',
  scale_unclear: 'a photo showing the item next to something for scale (e.g. a door or a person’s hand)',
  quantity_unclear: 'a wider photo showing the full quantity/pile of items together',
  model_label_missing: 'a close-up of the model/serial label (for appliances/electronics)',
  access_path_unclear: 'a photo of the doorway/hallway/stairs crew will use to remove the item',
  load_context_missing: 'a photo showing where the item currently sits (room/garage/yard)',
  contamination_unclear: 'a clear photo confirming the item is free of pests, mold, or contamination',
};

const PHOTO_TYPE_FOR_EVIDENCE = {
  missing_full_item_view: 'full_item_view',
  missing_damage_close_up: 'damage_photo',
  scale_unclear: 'full_item_view',
  quantity_unclear: 'total_quantity_context',
  model_label_missing: 'label_or_model',
  access_path_unclear: 'additional_angle',
  load_context_missing: 'additional_angle',
  contamination_unclear: 'condition_close_up',
};

// Map free-text additional_photo_requirements strings from the vision
// model onto the controlled evidence vocabulary above.
function classifyEvidenceGap(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('scale') || t.includes('size reference')) return MISSING_EVIDENCE_REASONS.SCALE_UNCLEAR;
  if (t.includes('quantity') || t.includes('how many') || t.includes('pile') || t.includes('wider shot') || t.includes('all items')) return MISSING_EVIDENCE_REASONS.QUANTITY_UNCLEAR;
  if (t.includes('model') || t.includes('serial') || t.includes('label')) return MISSING_EVIDENCE_REASONS.MODEL_LABEL_MISSING;
  if (t.includes('access') || t.includes('doorway') || t.includes('stair') || t.includes('hallway')) return MISSING_EVIDENCE_REASONS.ACCESS_PATH_UNCLEAR;
  if (t.includes('mold') || t.includes('pest') || t.includes('contamina') || t.includes('infest')) return MISSING_EVIDENCE_REASONS.CONTAMINATION_UNCLEAR;
  if (t.includes('damage') || t.includes('tear') || t.includes('stain') || t.includes('close-up') || t.includes('closeup')) return MISSING_EVIDENCE_REASONS.MISSING_DAMAGE_CLOSE_UP;
  if (t.includes('context') || t.includes('room') || t.includes('where')) return MISSING_EVIDENCE_REASONS.LOAD_CONTEXT_MISSING;
  return MISSING_EVIDENCE_REASONS.MISSING_FULL_ITEM_VIEW;
}

// ------------------------------------------------------------
// evaluatePhotoSufficiency — pure decision function.
//
// analysis: the ai_recommendation + items returned by
//   analyzeDonationPhotos() (lib/donationVision.js)
// policy: active donation_policy_versions row (for manual_review_threshold)
// ------------------------------------------------------------
export function evaluatePhotoSufficiency({ photos = [], analysis, items = [], policy = null }) {
  const baseCheck = validateDonationPhotos(photos, REQUIRED_DONATION_PHOTO_TYPES);
  if (!baseCheck.ok) {
    const missingEvidence = baseCheck.missing.map((type) => {
      if (type === 'full_item_view') return MISSING_EVIDENCE_REASONS.MISSING_FULL_ITEM_VIEW;
      if (type === 'damage_photo') return MISSING_EVIDENCE_REASONS.MISSING_DAMAGE_CLOSE_UP;
      if (type === 'total_quantity_context') return MISSING_EVIDENCE_REASONS.QUANTITY_UNCLEAR;
      return MISSING_EVIDENCE_REASONS.MISSING_FULL_ITEM_VIEW;
    });
    return { status: 'more_photos_required', missing_evidence: [...new Set(missingEvidence)], requested_photo_types: baseCheck.missing };
  }

  const threshold = Number(policy?.manual_review_threshold ?? 0.72);
  const gapTexts = [
    ...(analysis?.additional_photo_requirements || []),
    ...items.flatMap((it) => it.additional_photo_requirements || []),
  ];

  if (gapTexts.length) {
    const missingEvidence = [...new Set(gapTexts.map(classifyEvidenceGap))];
    const requestedPhotoTypes = [...new Set(missingEvidence.map((e) => PHOTO_TYPE_FOR_EVIDENCE[e]).filter(Boolean))];
    return { status: 'more_photos_required', missing_evidence: missingEvidence, requested_photo_types: requestedPhotoTypes };
  }

  const hasNotSuitable = items.some((it) => it.donation_suitability === 'not_suitable' || it.suitability === 'not_suitable');
  const hazmatOrPest = items.some((it) => (it.hazmat_indicators || it.hazardous_material_indicators || []).length || (it.pest_contamination_indicators || it.pest_or_contamination_indicators || []).length);
  const confidence = Number(analysis?.confidence ?? 1);

  if (hasNotSuitable && confidence >= 0.85 && !hazmatOrPest) {
    return { status: 'automatic_rejection', missing_evidence: [], requested_photo_types: [] };
  }
  if (hazmatOrPest || confidence < threshold || analysis?.suitability === 'needs_manual_review' || hasNotSuitable) {
    return { status: 'manual_review_required', missing_evidence: hazmatOrPest ? [MISSING_EVIDENCE_REASONS.CONTAMINATION_UNCLEAR] : [], requested_photo_types: [] };
  }

  return { status: 'sufficient', missing_evidence: [], requested_photo_types: [] };
}

// ------------------------------------------------------------
// requestAdditionalDonationPhotos — persists the sufficiency verdict
// and, when photos are missing, sends a SPECIFIC Quo SMS through the
// existing central sender (never a vague "send more photos").
// ------------------------------------------------------------
export async function requestAdditionalDonationPhotos({ donationRequestId, phone, missingEvidence, requestedPhotoTypes, donationAiAnalysisId = null, actorType = 'system', actorId = null }) {
  const specifics = (missingEvidence.length ? missingEvidence : ['missing_full_item_view'])
    .map((reason) => EVIDENCE_MESSAGES[reason] || 'a clearer photo of the item')
    .slice(0, 3);
  const body = `Junk Haul Calgary: to review your donation pickup request we need: ${specifics.join('; ')}. Please add these photos at junkhaul.ca/book/donation (your request is saved). — This does not confirm pickup yet.`;

  let message = null;
  try {
    message = await sendSMS(phone, body, { donation_request_id: donationRequestId, message_type: 'donation_photo_request', workflow_action: 'donation_request_photos' });
  } catch (e) {
    message = { ok: false, error: e.message };
  }

  const { data: messageRow } = message?.id
    ? await supabaseAdmin.from('messages').select('id').eq('provider_sid', message.id).order('sent_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const { data: sufficiencyRow } = await supabaseAdmin
    .from('donation_photo_sufficiency')
    .insert({
      donation_request_id: donationRequestId,
      donation_ai_analysis_id: donationAiAnalysisId,
      status: 'more_photos_required',
      missing_evidence: missingEvidence,
      requested_photo_types: requestedPhotoTypes,
      quo_message_id: messageRow?.id || null,
    })
    .select()
    .single();

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: donationRequestId,
    event_type: 'donation_photo_request_sent',
    actor_type: actorType,
    actor_id: actorId,
    source: 'donation_photo_sufficiency',
    metadata: { missing_evidence: missingEvidence, requested_photo_types: requestedPhotoTypes, message },
  });

  return sufficiencyRow;
}

// ------------------------------------------------------------
// recordPhotoSufficiency — persists a sufficiency verdict that does
// NOT require sending a photo request (sufficient / manual_review /
// automatic_rejection outcomes).
// ------------------------------------------------------------
export async function recordPhotoSufficiency({ donationRequestId, donationAiAnalysisId = null, status, missingEvidence = [], requestedPhotoTypes = [] }) {
  const { data } = await supabaseAdmin
    .from('donation_photo_sufficiency')
    .insert({
      donation_request_id: donationRequestId,
      donation_ai_analysis_id: donationAiAnalysisId,
      status,
      missing_evidence: missingEvidence,
      requested_photo_types: requestedPhotoTypes,
    })
    .select()
    .single();
  return data;
}
