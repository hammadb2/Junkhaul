import { supabaseAdmin } from './supabase.js';
import { recordTimelineEvent } from './timeline.js';
import { recordAuditEvent } from './auditEvents.js';
import { quoteWithCost, toCents, fromCents } from './costLedger.js';
import { calculatePrice, PRICING } from './pricingConstants.js';

const DEFAULT_EXPIRY_MINUTES = 24 * 60;
const DEPOSIT_CENTS = 5000;

function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'QD-';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function uniqueRef(client) {
  // Sufficiently unlikely collision for a quote ref; retries on conflict.
  return generateRef();
}

function isExpired(row) {
  return new Date(row.expiry_at) < new Date();
}

function evidenceComplete(quoteInput) {
  // Evidence must be recorded by the item evidence pipeline.
  // Tier A/B allows auto-quote; Tier C requires extra review; Tier D / pending
  // blocks automatic quoting.
  const status = quoteInput.item_evidence_status;
  if (status === 'complete') return true;
  if (status === 'review_required') return false;
  // Legacy fallback: photos + AI load estimate.
  if (quoteInput.photos && quoteInput.photos.length > 0) return true;
  if (quoteInput.ai_load_estimate && (quoteInput.ai_confidence ?? 0) >= 0.5) return true;
  if (quoteInput.description_text && (quoteInput.load_size !== 'full' || quoteInput.photo_skipped)) {
    return true;
  }
  return false;
}

// ============================================================
// CONFIDENCE SCORING — 0-100, blending three independent signals:
//  - evidence completeness (photos/description/item-evidence tier)
//  - the AI estimate's own reported confidence
//  - how much margin buffer sits above the hard profit floor
// Bucketed into high/medium/low. A 'low' tier forces manual review even
// when the price and margin checks alone would approve instantly — the
// price can look fine while still being built on a shaky estimate.
// ============================================================
export function computeConfidenceScore({ quoteInput, marginPercent, policy = {} }) {
  let evidenceScore;
  const status = quoteInput.item_evidence_status;
  if (status === 'complete') evidenceScore = 100;
  else if (status === 'review_required') evidenceScore = 20;
  else if (quoteInput.photos && quoteInput.photos.length > 0) evidenceScore = 80;
  else if (quoteInput.ai_load_estimate && (quoteInput.ai_confidence ?? 0) >= 0.5) evidenceScore = 70;
  else if (quoteInput.description_text) evidenceScore = 50;
  else evidenceScore = 20;

  // Default to a neutral 60 when no ai_confidence was ever recorded
  // (e.g. a pure flat-rate/manual quote with no vision model involved),
  // rather than penalizing it as if it were a known-bad estimate.
  const aiConfidenceScore = quoteInput.ai_confidence != null ? Number(quoteInput.ai_confidence) * 100 : 60;

  // 0% buffer above the hard profit floor -> 0; 10+ points of buffer -> 100.
  const floorPercent = Number(policy.minimum_contribution_percent || 0);
  const bufferPercent = marginPercent !== undefined ? marginPercent - floorPercent : 0;
  const marginBufferScore = Math.max(0, Math.min(100, (bufferPercent / 10) * 100));

  const score = Math.round(evidenceScore * 0.4 + aiConfidenceScore * 0.3 + marginBufferScore * 0.3);
  const tier = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
  return { score, tier, components: { evidenceScore, aiConfidenceScore, marginBufferScore } };
}

export function decide({
  quoteInput,
  priceCents,
  minimumPriceCents,
  contributionCents,
  marginPercent,
  // Optional — the resolved pricing_policy_versions row and a
  // pre-computed confidence score. Both default to inert values so
  // existing callers/tests that don't pass them see unchanged behavior.
  policy = {},
  confidence = null,
}) {
  const reasons = [];
  if (!quoteInput.load_size || !PRICING.loads[quoteInput.load_size]) {
    return { state: 'rejected', reasons: [{ code: 'invalid_load_size', message: 'Missing or invalid load size.' }] };
  }
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return { state: 'rejected', reasons: [{ code: 'invalid_price', message: 'Price must be a positive number of cents.' }] };
  }
  if (minimumPriceCents <= 0) {
    return { state: 'rejected', reasons: [{ code: 'invalid_minimum', message: 'Minimum price could not be computed.' }] };
  }
  if (!evidenceComplete(quoteInput)) {
    reasons.push({ code: 'needs_evidence', message: 'Photos or a description are needed for a firm quote.' });
    return { state: 'needs_evidence', reasons };
  }
  if (priceCents < minimumPriceCents) {
    reasons.push({
      code: 'below_minimum_price',
      message: `Quoted price $${fromCents(priceCents)} is below the policy minimum $${fromCents(minimumPriceCents)}.`,
      minimum_price_cents: minimumPriceCents,
      shortfall_cents: minimumPriceCents - priceCents,
    });
    return { state: 'manual_review', reasons };
  }
  if (marginPercent !== undefined && marginPercent < 0) {
    reasons.push({ code: 'negative_margin', message: 'Margin is negative.', margin_percent: marginPercent });
    return { state: 'manual_review', reasons };
  }

  // ---- Profit protection: min $ profit AND min margin %, both hard
  // floors distinct from the target-margin price the quote was built
  // from. A quote can clear the target-margin price above and still
  // fall short of one of these if surcharges/discounts/rounding pulled
  // it back down. ----
  const minContributionCents = toCents(Number(policy.minimum_contribution_dollars || 0));
  if (minContributionCents > 0 && contributionCents < minContributionCents) {
    reasons.push({
      code: 'below_minimum_profit_dollars',
      message: `Contribution $${fromCents(contributionCents)} is below the required minimum profit of $${fromCents(minContributionCents)}.`,
      minimum_contribution_cents: minContributionCents,
      contribution_cents: contributionCents,
    });
    return { state: 'manual_review', reasons };
  }
  const minContributionPercent = Number(policy.minimum_contribution_percent || 0);
  if (minContributionPercent > 0 && marginPercent !== undefined && marginPercent < minContributionPercent) {
    reasons.push({
      code: 'below_minimum_contribution_percent',
      message: `Margin ${marginPercent}% is below the required minimum ${minContributionPercent}%.`,
      minimum_contribution_percent: minContributionPercent,
      margin_percent: marginPercent,
    });
    return { state: 'manual_review', reasons };
  }

  // ---- Softer review thresholds (admin-configured, e.g.
  // {"margin_review_below_percent":15,"owner_review_above_dollar":1000}) —
  // these flag jobs for a human look even when they clear every hard
  // floor above. ----
  const reviewThresholds = policy.review_thresholds || {};
  if (
    reviewThresholds.margin_review_below_percent !== undefined &&
    marginPercent !== undefined &&
    marginPercent < Number(reviewThresholds.margin_review_below_percent)
  ) {
    reasons.push({
      code: 'margin_below_review_threshold',
      message: `Margin ${marginPercent}% is below the ${reviewThresholds.margin_review_below_percent}% review threshold.`,
      threshold_percent: Number(reviewThresholds.margin_review_below_percent),
      margin_percent: marginPercent,
    });
    return { state: 'manual_review', reasons };
  }
  if (
    reviewThresholds.owner_review_above_dollar !== undefined &&
    fromCents(priceCents) > Number(reviewThresholds.owner_review_above_dollar)
  ) {
    reasons.push({
      code: 'high_value_owner_review',
      message: `Price $${fromCents(priceCents)} exceeds the $${reviewThresholds.owner_review_above_dollar} owner-review threshold.`,
      threshold_dollars: Number(reviewThresholds.owner_review_above_dollar),
    });
    return { state: 'manual_review', reasons };
  }

  // ---- Quote confidence gating: a low-confidence estimate (weak
  // evidence, low AI confidence, thin margin buffer) goes to manual
  // review even though price/margin alone would approve it instantly. ----
  if (confidence && confidence.tier === 'low') {
    reasons.push({
      code: 'low_confidence_estimate',
      message: `Confidence score ${confidence.score}/100 is too low to instant-book; needs a manual look.`,
      confidence_score: confidence.score,
    });
    return { state: 'manual_review', reasons };
  }

  reasons.push({ code: 'approved', message: 'Price meets policy minimum and evidence is sufficient.' });
  return { state: 'approved', reasons };
}

async function computeCostSnapshot({ quoteInput, client = supabaseAdmin }) {
  const distanceKm = (quoteInput.travel_km || 0) * 2 || undefined;
  const booking = {
    id: `quote-${Date.now()}`,
    load_size: quoteInput.load_size,
    lat: quoteInput.lat,
    lng: quoteInput.lng,
    address: quoteInput.address,
    total_price: fromCents(quoteInput.requested_price_cents ?? 0),
    // Real AI-estimated weight/volume (when available) drive truck
    // selection — see selectTruckFromProfiles in lib/costConfig.js —
    // instead of the load_size tier's rough representative figures.
    weight_kg: quoteInput.ai_weight_estimate_kg || undefined,
    volume_cuft: quoteInput.ai_volume_estimate_cuft || undefined,
    stairs: quoteInput.stairs || 0,
  };
  const cost = await quoteWithCost({
    booking,
    distanceKm,
    revenueCents: quoteInput.requested_price_cents,
    client,
  });
  return cost;
}

export async function createQuoteDecision({
  quoteInput,
  priceCents,
  costSnapshot,
  depositCents = DEPOSIT_CENTS,
  actorType = 'system',
  actorId = null,
  expiryMinutes = DEFAULT_EXPIRY_MINUTES,
  client = supabaseAdmin,
}) {
  if (!quoteInput || !quoteInput.load_size) {
    throw new Error('quoteInput with load_size is required');
  }
  const snapshot = costSnapshot || (await computeCostSnapshot({ quoteInput, client }));
  const minimumPriceCents = snapshot.breakdown.minimum_price_cents;
  const contributionCents = priceCents - snapshot.breakdown.total_cost_cents;
  const marginPercent = priceCents > 0 ? Number(((contributionCents / priceCents) * 100).toFixed(2)) : 0;
  const policy = snapshot.cfg?.policy || {};
  const confidence = computeConfidenceScore({ quoteInput, marginPercent, policy });

  const { state, reasons } = decide({ quoteInput, priceCents, minimumPriceCents, contributionCents, marginPercent, policy, confidence });

  const ref = uniqueRef();
  const expiry = new Date(Date.now() + expiryMinutes * 60_000).toISOString();

  const row = {
    quote_decision_ref: ref,
    state,
    quote_snapshot: quoteInput,
    cost_snapshot: snapshot,
    confidence_score: confidence.score,
    confidence_tier: confidence.tier,
    price_cents: priceCents,
    minimum_price_cents: minimumPriceCents,
    proposed_price_cents: priceCents,
    margin_percent: marginPercent,
    contribution_cents: contributionCents,
    policy_version_id: snapshot.sourceVersions?.pricing_policy_version_id || null,
    expiry_at: expiry,
    decision_reasons: reasons,
    deposit_cents: depositCents,
  };

  const { data, error } = await client.from('quote_decisions').insert(row).select().single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'quote_decision',
    entity_id: data.id,
    event_type: `quote_decision_${state}`,
    actor_type: actorType,
    actor_id: actorId,
    source: 'quote_decision_service',
    reason: reasons.map((r) => r.message).join('; '),
    metadata: { ref, price_cents: priceCents, minimum_price_cents: minimumPriceCents, confidence_score: confidence.score, confidence_tier: confidence.tier },
  });

  return data;
}

export async function getQuoteDecisionByRef(ref, client = supabaseAdmin) {
  const { data, error } = await client.from('quote_decisions').select('*').eq('quote_decision_ref', ref).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.state === 'approved' && isExpired(data)) {
    await client.from('quote_decisions').update({ state: 'expired' }).eq('id', data.id);
    data.state = 'expired';
  }
  return data;
}

export async function getQuoteDecision(id, client = supabaseAdmin) {
  const { data, error } = await client.from('quote_decisions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.state === 'approved' && isExpired(data)) {
    await client.from('quote_decisions').update({ state: 'expired' }).eq('id', data.id);
    data.state = 'expired';
  }
  return data;
}

export async function authorizeQuoteDecision({
  decisionId,
  managerId,
  reason,
  newPriceCents,
  authorizationLimitCents,
  actorType = 'manager',
  client = supabaseAdmin,
}) {
  if (!managerId || !reason) {
    throw new Error('managerId and reason are required for an override');
  }
  const before = await getQuoteDecision(decisionId, client);
  if (!before) throw new Error('Quote decision not found');
  if (before.state === 'booked' || before.state === 'rejected' || before.state === 'superseded') {
    throw new Error(`Cannot override a ${before.state} quote decision`);
  }

  const finalPriceCents = newPriceCents ?? before.price_cents;
  const contributionCents = finalPriceCents - before.cost_snapshot.breakdown.total_cost_cents;
  const marginPercent = finalPriceCents > 0 ? Number(((contributionCents / finalPriceCents) * 100).toFixed(2)) : 0;
  const afterState = finalPriceCents >= before.minimum_price_cents ? 'approved' : 'approved_override';

  const { data, error } = await client
    .from('quote_decisions')
    .update({
      state: 'approved',
      price_cents: finalPriceCents,
      proposed_price_cents: finalPriceCents,
      contribution_cents: contributionCents,
      margin_percent: marginPercent,
      authorized_by: managerId,
      authorized_at: new Date().toISOString(),
      authorization_reason: reason,
      authorization_limit_cents: authorizationLimitCents ?? null,
      decision_reasons: [
        ...before.decision_reasons,
        { code: 'manager_override', message: reason, authorized_by: managerId, authorized_at: new Date().toISOString() },
      ],
    })
    .eq('id', decisionId)
    .select()
    .single();
  if (error) throw error;

  await recordAuditEvent({
    entity_type: 'quote_decision',
    entity_id: decisionId,
    event_type: 'quote_decision_manager_override',
    actor_type: actorType,
    actor_id: managerId,
    reason,
    before_state: before,
    after_state: data,
    metadata: { authorization_limit_cents: authorizationLimitCents, new_price_cents: finalPriceCents },
  });

  return data;
}

export async function validateQuoteForPayment({
  decisionRef,
  amountCents,
  isDeposit = false,
  client = supabaseAdmin,
}) {
  const decision = await getQuoteDecisionByRef(decisionRef, client);
  if (!decision) throw new Error('Quote decision not found');
  if (decision.state !== 'approved') throw new Error(`Quote decision is ${decision.state}`);
  if (isExpired(decision)) throw new Error('Quote decision expired');

  if (isDeposit) {
    if (amountCents !== decision.deposit_cents) {
      throw new Error(`Deposit amount mismatch: expected ${decision.deposit_cents}, got ${amountCents}`);
    }
    if (amountCents > decision.price_cents) {
      throw new Error('Deposit cannot exceed total approved price');
    }
  } else if (amountCents !== decision.price_cents) {
    throw new Error(`Payment amount mismatch: expected ${decision.price_cents}, got ${amountCents}`);
  }
  return decision;
}

export async function linkQuoteDecisionToBooking({ decisionId, bookingId, client = supabaseAdmin }) {
  const decision = await getQuoteDecision(decisionId, client);
  if (!decision) throw new Error('Quote decision not found');
  if (decision.state !== 'approved') throw new Error(`Quote decision is ${decision.state}`);
  if (isExpired(decision)) throw new Error('Quote decision expired');

  const { data, error } = await client
    .from('quote_decisions')
    .update({ booking_id: bookingId })
    .eq('id', decisionId)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'booking',
    entity_id: bookingId,
    event_type: 'booking_linked_to_quote_decision',
    actor_type: 'system',
    source: 'quote_decision_service',
    reason: `Quote decision ${decision.quote_decision_ref} linked to pending booking`,
    metadata: { quote_decision_id: decisionId, price_cents: decision.price_cents },
  });

  return data;
}

export async function confirmQuoteDecisionBooking({ decisionId, bookingId, client = supabaseAdmin }) {
  const decision = await getQuoteDecision(decisionId, client);
  if (!decision) throw new Error('Quote decision not found');
  if (!['approved', 'booked'].includes(decision.state)) throw new Error(`Quote decision is ${decision.state}`);
  if (isExpired(decision)) throw new Error('Quote decision expired');

  const { data, error } = await client
    .from('quote_decisions')
    .update({ state: 'booked', booking_id: bookingId })
    .eq('id', decisionId)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'booking',
    entity_id: bookingId,
    event_type: 'booking_confirmed_by_quote_decision',
    actor_type: 'system',
    source: 'quote_decision_service',
    reason: `Quote decision ${decision.quote_decision_ref} approved and booking confirmed`,
    metadata: { quote_decision_id: decisionId, price_cents: decision.price_cents },
  });

  return data;
}

export async function supersedeQuoteDecision({ decisionId, newQuoteInput, client = supabaseAdmin }) {
  const before = await getQuoteDecision(decisionId, client);
  if (!before) throw new Error('Quote decision not found');
  if (before.state === 'booked') throw new Error('Cannot supersede a booked quote decision');

  const newDecision = await createQuoteDecision({
    quoteInput: newQuoteInput,
    priceCents: newQuoteInput.requested_price_cents ?? before.price_cents,
    client,
  });

  await client.from('quote_decisions').update({ state: 'superseded', superseded_by: newDecision.id }).eq('id', decisionId);

  await recordAuditEvent({
    entity_type: 'quote_decision',
    entity_id: decisionId,
    event_type: 'quote_decision_superseded',
    actor_type: 'system',
    before_state: before,
    after_state: newDecision,
    reason: 'Quote assumptions changed',
  });

  return newDecision;
}

export async function buildPriceWithQuoteDecision({
  quoteInput,
  requestedPriceCents,
  costSnapshot,
  client = supabaseAdmin,
}) {
  // Returns the legacy { priced, decision } shape so existing callers can
  // either use the server-enforced decision or fall back to guidance.
  const decision = await createQuoteDecision({
    quoteInput,
    priceCents: requestedPriceCents,
    costSnapshot,
    client,
  });
  return decision;
}
