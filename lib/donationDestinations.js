// ============================================================
// DONATION DESTINATION SCORING
//
// Scores every plausible drop-off destination for a donation request
// — donation centres, ReStore, charity, storage, Rehaul inventory,
// recycling, and (only when policy explicitly allows it) landfill as
// an absolute last resort. Never hardcodes a single destination for
// every item: donation_centers rows carry their own
// accepted/rejected categories, operating hours, and resale potential,
// and every candidate (considered or rejected) is persisted so admins
// can see why one was picked over another.
// ============================================================

import { supabaseAdmin } from './supabase.js';

export const DESTINATION_TYPES = ['donation_centre', 'restore', 'charity', 'storage', 'rehaul_inventory', 'recycling', 'landfill'];

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function isOpenNow(operatingHours) {
  if (!operatingHours || typeof operatingHours !== 'object' || Object.keys(operatingHours).length === 0) return true; // unknown hours -> don't penalize
  const day = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3);
  const today = operatingHours[day];
  if (!today) return false;
  if (today === 'closed') return false;
  return true;
}

function itemCategories(items) {
  return [...new Set(items.map((it) => (it.category || '').toLowerCase()).filter(Boolean))];
}

// ------------------------------------------------------------
// scoreDonationCenterCandidate — donation_centers rows carry a
// destination_type of donation_centre / restore / charity /
// rehaul_inventory / recycling (added in the intelligence-phase
// migration).
// ------------------------------------------------------------
export function scoreDonationCenterCandidate(center, { categories, pickup, resaleFriendly }) {
  const breakdown = {};
  if ((center.rejected_categories || []).some((c) => categories.includes(c.toLowerCase()))) {
    return { considered: false, score: 0, score_breakdown: breakdown, rejection_reason: 'category_not_accepted' };
  }
  if ((center.accepted_categories || []).length && !categories.some((c) => center.accepted_categories.map((a) => a.toLowerCase()).includes(c))) {
    return { considered: false, score: 0, score_breakdown: breakdown, rejection_reason: 'category_not_in_accepted_list' };
  }

  let score = 50;
  breakdown.base = 50;

  const open = isOpenNow(center.operating_hours);
  breakdown.open_now = open ? 15 : -20;
  score += breakdown.open_now;
  if (!open) {
    return { considered: false, score: Math.max(0, score), score_breakdown: breakdown, rejection_reason: 'closed' };
  }

  if (pickup?.lat && center.lat) {
    const distanceKm = haversineKm(pickup.lat, pickup.lng, center.lat, center.lng);
    breakdown.distance_km = Number(distanceKm.toFixed(1));
    breakdown.distance_score = Math.max(0, 20 - distanceKm); // closer is better, caps around 20km
    score += breakdown.distance_score;
  }

  if (resaleFriendly && ['restore', 'rehaul_inventory'].includes(center.destination_type)) {
    const resaleBonus = center.resale_potential === 'high' ? 20 : center.resale_potential === 'medium' ? 10 : 0;
    breakdown.resale_bonus = resaleBonus;
    score += resaleBonus;
  }

  if (Number.isFinite(Number(center.current_load_pct))) {
    const loadPenalty = Math.round((Number(center.current_load_pct) / 100) * 15);
    breakdown.load_penalty = -loadPenalty;
    score -= loadPenalty;
  }

  return { considered: true, score: Math.max(0, Math.round(score)), score_breakdown: breakdown, rejection_reason: null };
}

export function scoreStorageCandidate(facility, { pickup }) {
  const breakdown = {};
  if (!facility.is_active) return { considered: false, score: 0, score_breakdown: breakdown, rejection_reason: 'facility_inactive' };
  const usagePct = Number(facility.current_usage_pct) || 0;
  if (usagePct >= 95) return { considered: false, score: 0, score_breakdown: breakdown, rejection_reason: 'storage_at_capacity' };

  let score = 40;
  breakdown.base = 40;
  breakdown.available_capacity = Math.round((100 - usagePct) / 5);
  score += breakdown.available_capacity;

  if (pickup?.lat && facility.lat) {
    const distanceKm = haversineKm(pickup.lat, pickup.lng, facility.lat, facility.lng);
    breakdown.distance_km = Number(distanceKm.toFixed(1));
    breakdown.distance_score = Math.max(0, 15 - distanceKm);
    score += breakdown.distance_score;
  }
  return { considered: true, score: Math.max(0, Math.round(score)), score_breakdown: breakdown, rejection_reason: null };
}

export function scoreLandfillCandidate(landfill, { pickup }) {
  const breakdown = { base: 5, note: 'last_resort_fallback' };
  let score = 5;
  if (pickup?.lat && landfill.lat) {
    const distanceKm = haversineKm(pickup.lat, pickup.lng, landfill.lat, landfill.lng);
    breakdown.distance_km = Number(distanceKm.toFixed(1));
    breakdown.distance_score = Math.max(0, 10 - distanceKm);
    score += breakdown.distance_score;
  }
  return { considered: true, score: Math.round(score), score_breakdown: breakdown, rejection_reason: null };
}

// ------------------------------------------------------------
// scoreDestinations — scores every candidate destination for a
// donation request and persists the full considered/rejected list to
// donation_destination_scores. Returns the sorted candidate list
// (highest score first among considered=true).
// ------------------------------------------------------------
export async function scoreDestinations({ donationRequestId, donationRequestItemId = null }) {
  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('*').eq('id', donationRequestId).single();
  if (!donationRequest) throw new Error('Donation request not found');

  const { data: items } = await supabaseAdmin.from('donation_request_items').select('*').eq('donation_request_id', donationRequestId);
  const categories = itemCategories(items || []);
  const resaleFriendly = (items || []).some((it) => ['good', 'like_new'].includes(it.condition));
  const pickup = { lat: donationRequest.lat, lng: donationRequest.lng };

  const policy = donationRequest.policy_version_id
    ? (await supabaseAdmin.from('donation_policy_versions').select('*').eq('id', donationRequest.policy_version_id).maybeSingle()).data
    : null;
  const allowLandfillFallback = Boolean(policy?.route_fit_limits?.allow_landfill_fallback);

  const [{ data: centers }, { data: facilities }, { data: landfills }] = await Promise.all([
    supabaseAdmin.from('donation_centers').select('*').eq('is_active', true),
    supabaseAdmin.from('storage_facilities').select('*'),
    supabaseAdmin.from('landfills').select('*'),
  ]);

  const candidates = [];
  for (const center of centers || []) {
    const result = scoreDonationCenterCandidate(center, { categories, pickup, resaleFriendly });
    candidates.push({ destination_type: center.destination_type || 'donation_centre', destination_id: center.id, destination_name: center.name, ...result });
  }
  for (const facility of facilities || []) {
    const result = scoreStorageCandidate(facility, { pickup });
    candidates.push({ destination_type: 'storage', destination_id: facility.id, destination_name: facility.name, ...result });
  }

  const anyAccepted = candidates.some((c) => c.considered);
  if (!anyAccepted && allowLandfillFallback) {
    for (const landfill of landfills || []) {
      const result = scoreLandfillCandidate(landfill, { pickup });
      candidates.push({ destination_type: 'landfill', destination_id: landfill.id, destination_name: landfill.name, ...result });
    }
  }

  const rows = candidates.map((c) => ({
    donation_request_id: donationRequestId,
    donation_request_item_id: donationRequestItemId,
    destination_type: c.destination_type,
    destination_id: c.destination_id,
    destination_name: c.destination_name,
    considered: c.considered,
    score: c.score,
    score_breakdown: c.score_breakdown,
    rejection_reason: c.rejection_reason,
  }));

  const { data: inserted, error } = rows.length
    ? await supabaseAdmin.from('donation_destination_scores').insert(rows).select()
    : { data: [], error: null };
  if (error) throw error;

  return [...inserted].sort((a, b) => (b.considered - a.considered) || (b.score - a.score));
}

// ------------------------------------------------------------
// selectDestination — picks the top-scored considered candidate as
// the AI-selected destination and records it on the donation request.
// A human override is a SEPARATE, explicit call (overrideDestination)
// so the audit trail always shows whether a destination was AI-picked
// or human-overridden, and why.
// ------------------------------------------------------------
export async function selectDestination({ donationRequestId, scores }) {
  const best = scores.find((s) => s.considered);
  if (!best) return null;
  await supabaseAdmin.from('donation_requests').update({ selected_destination_score_id: best.id }).eq('id', donationRequestId);
  return best;
}

export async function overrideDestination({ donationRequestId, destinationScoreId, reason, actorId }) {
  if (!reason) throw new Error('Destination override requires a reason');
  const { data, error } = await supabaseAdmin
    .from('donation_requests')
    .update({ selected_destination_score_id: destinationScoreId, destination_override_reason: reason, destination_override_by: actorId })
    .eq('id', donationRequestId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
