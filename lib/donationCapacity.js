// ============================================================
// DONATION CAPACITY ESTIMATION
//
// Turns the per-item vision analysis for a donation request into a
// single versioned truck-capacity estimate the route-fit engine can
// consume. Conservative by default when confidence is low — a
// donation stop that silently overflows the truck is worse than one
// that gets padded with an extra crew member or a few minutes.
//
// AI runs NEVER overwrite a manager's manual correction: each run
// (AI or manual) is its own row (versioned), and the "effective"
// estimate for route-fit is whichever row is marked is_final, falling
// back to the latest AI row only when nothing has been finalized.
// ============================================================

import { supabaseAdmin } from './supabase';
import { getNumberConfig } from './config';

export const CAPACITY_MODEL_VERSION = 'donation-capacity-v1';
const CONFIDENCE_CONSERVATIVE_THRESHOLD = 0.6;
const CONSERVATIVE_MULTIPLIER = 1.25;

const FRAGILE_CATEGORY_HINTS = ['electronics', 'mirror', 'glass', 'tv', 'lamp'];
const NON_STACKABLE_CATEGORY_HINTS = ['mattress', 'appliance', 'refrigerator', 'glass', 'mirror'];
const FLAT_ORIENTATION_HINTS = ['mattress', 'rug', 'mirror', 'tabletop'];
const UPRIGHT_ORIENTATION_HINTS = ['appliance', 'refrigerator', 'wardrobe', 'dresser', 'cabinet'];

function textHints(item) {
  return `${item.category || ''} ${item.subtype || ''} ${item.material || ''}`.toLowerCase();
}

function isFragile(item) {
  if (item?.damage?.present || item?.structural_damage?.present) return true;
  const t = textHints(item);
  return FRAGILE_CATEGORY_HINTS.some((hint) => t.includes(hint));
}

function isStackable(item) {
  const t = textHints(item);
  if (NON_STACKABLE_CATEGORY_HINTS.some((hint) => t.includes(hint))) return false;
  return !isFragile(item);
}

function requiredOrientation(item) {
  const t = textHints(item);
  if (FLAT_ORIENTATION_HINTS.some((hint) => t.includes(hint))) return 'flat';
  if (UPRIGHT_ORIENTATION_HINTS.some((hint) => t.includes(hint))) return 'upright';
  return 'either';
}

// Footprint heuristic in sqft when we only have a volume estimate
// (assume ~3.5ft stack height for household items).
function footprintSqft(item) {
  const dims = item.dimensions || item.estimated_dimensions || {};
  if (dims.length_in && dims.width_in) return (Number(dims.length_in) * Number(dims.width_in)) / 144;
  const volume = Number(item.volume_cuft ?? item.estimated_volume_cuft ?? 0);
  return volume ? volume / 3.5 : 0;
}

// ------------------------------------------------------------
// computeCapacityEstimate — derives a fresh AI capacity estimate
// from the current donation_request_items rows and persists it as
// the next version for the request.
// ------------------------------------------------------------
export async function computeCapacityEstimate({ donationRequestId, actorId = null }) {
  const { data: items } = await supabaseAdmin
    .from('donation_request_items')
    .select('*')
    .eq('donation_request_id', donationRequestId);

  const rows = items || [];
  const quantities = rows.map((it) => it.quantity || 1);
  const totalQuantity = quantities.reduce((a, b) => a + b, 0) || rows.length || 1;

  const volumeCuft = rows.reduce((sum, it) => sum + (Number(it.volume_cuft) || 0) * (it.quantity || 1), 0);
  const weightMin = rows.reduce((sum, it) => sum + (Number(it.weight_kg_min ?? it.weight_kg) || 0) * (it.quantity || 1), 0);
  const weightMax = rows.reduce((sum, it) => sum + (Number(it.weight_kg_max ?? it.weight_kg) || 0) * (it.quantity || 1), 0);
  const floorSpaceSqft = rows.reduce((sum, it) => sum + footprintSqft(it) * (it.quantity || 1), 0);

  const fragile = rows.some(isFragile);
  const stackable = rows.length > 0 && rows.every(isStackable);
  const orientations = new Set(rows.map(requiredOrientation));
  const requiredOrientationOverall = orientations.size === 1 ? [...orientations][0] : 'mixed';

  const confidences = rows.map((it) => Number(it.confidence)).filter((n) => Number.isFinite(n));
  const confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.5;
  const isConservative = confidence < CONFIDENCE_CONSERVATIVE_THRESHOLD || rows.length === 0;
  const multiplier = isConservative ? CONSERVATIVE_MULTIPLIER : 1;

  const anyHeavyItem = rows.some((it) => (Number(it.weight_kg_max ?? it.weight_kg) || 0) > 80);
  const crewCount = isConservative || anyHeavyItem || totalQuantity > 6 ? 3 : 2;

  const requiredEquipment = [];
  if (anyHeavyItem || weightMax * multiplier > 300) requiredEquipment.push('dolly');
  if (rows.some((it) => textHints(it).includes('sofa') || textHints(it).includes('couch') || textHints(it).includes('mattress'))) requiredEquipment.push('furniture_straps');
  if (fragile) requiredEquipment.push('moving_blankets');

  const [basePickup, baseLoading, baseUnloading] = await Promise.all([
    getNumberConfig('donation_pickup_duration_minutes', 20),
    getNumberConfig('donation_loading_duration_minutes', 15),
    getNumberConfig('donation_unloading_duration_minutes', 15),
  ]);

  const itemScale = Math.max(1, Math.ceil(totalQuantity / 3));
  const pickupDurationMinutes = Math.round(basePickup * multiplier);
  const loadingDurationMinutes = Math.round(baseLoading * itemScale * multiplier);
  const unloadingDurationMinutes = Math.round(baseUnloading * itemScale * multiplier);

  const { data: priorVersions } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .select('version')
    .eq('donation_request_id', donationRequestId)
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion = (priorVersions?.[0]?.version || 0) + 1;

  const { data: row, error } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .insert({
      donation_request_id: donationRequestId,
      version: nextVersion,
      source: 'ai',
      ai_version: CAPACITY_MODEL_VERSION,
      volume_cuft: Number((volumeCuft * multiplier).toFixed(2)),
      weight_kg_min: Number((weightMin * multiplier).toFixed(1)),
      weight_kg_max: Number((weightMax * multiplier).toFixed(1)),
      floor_space_sqft: Number((floorSpaceSqft * multiplier).toFixed(1)),
      stackable,
      fragile,
      required_orientation: requiredOrientationOverall,
      crew_count: crewCount,
      required_equipment: requiredEquipment,
      pickup_duration_minutes: pickupDurationMinutes,
      loading_duration_minutes: loadingDurationMinutes,
      unloading_duration_minutes: unloadingDurationMinutes,
      confidence: Number(confidence.toFixed(2)),
      is_conservative: isConservative,
      is_final: false,
      created_by: actorId,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

// ------------------------------------------------------------
// applyCapacityCorrection — a manager's correction is its OWN
// versioned, final row. The AI never overwrites it: the next AI
// re-run just adds a newer non-final row that route-fit ignores as
// long as a later manual row is marked is_final.
// ------------------------------------------------------------
export async function applyCapacityCorrection({ donationRequestId, correction, actorId, reason = null }) {
  const { data: priorVersions } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .select('*')
    .eq('donation_request_id', donationRequestId)
    .order('version', { ascending: false })
    .limit(1);
  const base = priorVersions?.[0] || {};
  const nextVersion = (base.version || 0) + 1;

  const { data: row, error } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .insert({
      donation_request_id: donationRequestId,
      version: nextVersion,
      source: 'manual',
      ai_version: base.ai_version || null,
      volume_cuft: correction.volume_cuft ?? base.volume_cuft,
      weight_kg_min: correction.weight_kg_min ?? base.weight_kg_min,
      weight_kg_max: correction.weight_kg_max ?? base.weight_kg_max,
      floor_space_sqft: correction.floor_space_sqft ?? base.floor_space_sqft,
      stackable: correction.stackable ?? base.stackable,
      fragile: correction.fragile ?? base.fragile,
      required_orientation: correction.required_orientation ?? base.required_orientation,
      crew_count: correction.crew_count ?? base.crew_count,
      required_equipment: correction.required_equipment ?? base.required_equipment,
      pickup_duration_minutes: correction.pickup_duration_minutes ?? base.pickup_duration_minutes,
      loading_duration_minutes: correction.loading_duration_minutes ?? base.loading_duration_minutes,
      unloading_duration_minutes: correction.unloading_duration_minutes ?? base.unloading_duration_minutes,
      confidence: 1,
      is_conservative: false,
      manual_correction: correction,
      corrected_by: actorId,
      corrected_at: new Date().toISOString(),
      is_final: true,
      created_by: actorId,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

// ------------------------------------------------------------
// getEffectiveCapacityEstimate — the value route-fit should trust:
// the latest manager-finalized row, or the latest AI row if nothing
// has been finalized yet.
// ------------------------------------------------------------
export async function getEffectiveCapacityEstimate(donationRequestId) {
  const { data: finalRow } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .select('*')
    .eq('donation_request_id', donationRequestId)
    .eq('is_final', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (finalRow) return finalRow;

  const { data: latestRow } = await supabaseAdmin
    .from('donation_capacity_estimates')
    .select('*')
    .eq('donation_request_id', donationRequestId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return latestRow || null;
}
