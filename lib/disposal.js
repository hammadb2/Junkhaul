// ============================================================
// disposal.js
//
// Disposal intelligence and dump reconciliation service.
//
// Responsibilities:
// - Resolve effective facility rates by waste stream and date.
// - Classify items/materials into disposal streams with uncertainty.
// - Predict disposal cost from estimated kg, facility, and rate.
// - Evaluate load-splitting when diversion savings exceed extra route/labor.
// - Record scale tickets (with OCR support), reconcile against predictions,
//   and raise alerts for anomalies.
// - Never overwrite predictions with actuals; keep variance visible.
// ============================================================

import { supabaseAdmin } from './supabase.js';
import { toCents as _toCents, fromCents as _fromCents, roundCents as _roundCents } from './money.js';
import { haversineKm } from './routeEngine.js';

export const toCents = _toCents;
export const fromCents = _fromCents;
export const roundCents = _roundCents;

const DEFAULT_STREAM = 'general';

const STREAM_KEYWORDS = {
  metal: ['metal', 'steel', 'iron', 'aluminum', 'copper', 'brass', 'wire', 'pipe', ' railing', 'fencing'],
  electronics: ['tv', 'television', 'monitor', 'computer', 'laptop', 'printer', 'electronics', 'e-waste', 'microwave'],
  appliance: ['fridge', 'refrigerator', 'freezer', 'washer', 'dryer', 'dishwasher', 'stove', 'oven', 'water heater', 'appliance'],
  donation: ['donate', 'furniture', 'couch', 'sofa', 'chair', 'table', 'dresser', 'bed frame', 'gently used', 'reusable'],
  yard: ['yard', 'garden', 'branches', 'leaves', 'grass', 'soil', 'dirt', 'mulch'],
  construction: ['drywall', 'concrete', 'wood', 'lumber', 'tile', 'carpet', 'renovation', 'construction', 'debris'],
  mattress: ['mattress', 'box spring'],
  hazmat: ['paint', 'chemical', 'oil', 'battery', 'tires', 'asbestos', 'freon'],
};

function itemStream(itemName) {
  const name = (itemName || '').toLowerCase();
  const scores = {};
  for (const [stream, keywords] of Object.entries(STREAM_KEYWORDS)) {
    for (const kw of keywords) {
      if (name.includes(kw)) {
        scores[stream] = (scores[stream] || 0) + 1;
      }
    }
  }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return { stream: DEFAULT_STREAM, confidence: 1, uncertainty: 'low' };
  const [stream, count] = entries[0];
  const confidence = Math.min(count + 1, 5);
  return {
    stream,
    confidence,
    uncertainty: confidence >= 4 ? 'low' : confidence >= 2 ? 'medium' : 'high',
  };
}

export function classifyItems(items = []) {
  const byStream = {};
  for (const item of items) {
    const name = typeof item === 'string' ? item : item.name;
    const qty = typeof item === 'string' ? 1 : (item.quantity || 1);
    const { stream, confidence, uncertainty } = itemStream(name);
    if (!byStream[stream]) byStream[stream] = { items: [], count: 0, minConfidence: Infinity, maxUncertainty: 'low' };
    byStream[stream].items.push({ name, qty, confidence, uncertainty });
    byStream[stream].count += qty;
    byStream[stream].minConfidence = Math.min(byStream[stream].minConfidence, confidence);
    if (uncertainty === 'high' || byStream[stream].maxUncertainty === 'high') {
      byStream[stream].maxUncertainty = 'high';
    } else if (uncertainty === 'medium' || byStream[stream].maxUncertainty === 'medium') {
      byStream[stream].maxUncertainty = 'medium';
    }
  }
  return Object.entries(byStream).map(([stream, data]) => ({
    stream,
    count: data.count,
    items: data.items,
    confidence: data.minConfidence,
    uncertainty: data.maxUncertainty,
  }));
}

export async function resolveFacilityRate({ facility, wasteStream = DEFAULT_STREAM, asOf, client = supabaseAdmin }) {
  const asOfDate = asOf ? new Date(asOf).toISOString() : new Date().toISOString();
  const { data, error } = await client
    .from('facility_rate_versions')
    .select('*')
    .eq('facility', facility)
    .eq('waste_stream', wasteStream)
    .lte('effective_from', asOfDate)
    .or(`effective_to.is.null,effective_to.gt.${asOfDate}`)
    .in('status', ['active', 'superseded'])
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return { flat_minimum: 0, per_tonne_rate: 0, surcharges: {}, item_fees: {}, version_id: null };
  }
  return {
    flat_minimum_cents: toCents(data.flat_minimum || 0),
    per_tonne_rate_cents: toCents(data.per_tonne_rate || 0),
    surcharges: data.surcharges || {},
    item_fees: data.item_fees || {},
    version_id: data.id,
    effective_from: data.effective_from,
  };
}

export function calculateDisposalCost({ netWeightKg, rate, surcharges = {}, itemFees = {}, items = [] }) {
  const flatCents = rate.flat_minimum_cents || 0;
  const perTonneCents = rate.per_tonne_rate_cents || 0;
  const tonne = netWeightKg / 1000;
  const weightCostCents = Math.round(perTonneCents * tonne);
  let surchargeCents = 0;
  if (surcharges.hard_to_handle_per_kg) {
    surchargeCents += Math.round(toCents(surcharges.hard_to_handle_per_kg) * netWeightKg);
  }
  if (surcharges.refrigerant_per_item) {
    const refrigerantItems = items.filter((it) => typeof it === 'string' ? /fridge|freezer|ac|refrigerant/i.test(it) : /fridge|freezer|ac|refrigerant/i.test(it.name || ''));
    surchargeCents += Math.round(toCents(surcharges.refrigerant_per_item) * refrigerantItems.length);
  }
  let itemFeeCents = 0;
  for (const it of items) {
    const name = typeof it === 'string' ? it : it.name || '';
    for (const [key, fee] of Object.entries(itemFees)) {
      if (name.toLowerCase().includes(key.toLowerCase())) {
        itemFeeCents += toCents(fee);
      }
    }
  }
  const total = Math.max(flatCents, weightCostCents + surchargeCents + itemFeeCents);
  return {
    flat_minimum_cents: flatCents,
    weight_cost_cents: weightCostCents,
    surcharge_cents: surchargeCents,
    item_fee_cents: itemFeeCents,
    total_cost_cents: total,
  };
}

export function predictDisposalCost({
  items = [],
  weightKg,
  facility,
  wasteStream = DEFAULT_STREAM,
  asOf,
  client = supabaseAdmin,
}) {
  if (!weightKg && Array.isArray(items) && items.length > 0) {
    // Estimate weight from load if not provided.
    const classified = classifyItems(items);
    const streamEntry = classified.find((c) => c.stream === wasteStream) || classified[0];
    weightKg = (streamEntry?.count || 1) * 50;
  }
  const netWeight = Number(weightKg) || 0;
  return resolveFacilityRate({ facility, wasteStream, asOf, client }).then((rate) => {
    const cost = calculateDisposalCost({ netWeightKg: netWeight, rate, surcharges: rate.surcharges, itemFees: rate.item_fees, items });
    return {
      net_weight_kg: netWeight,
      predicted_cost_cents: cost.total_cost_cents,
      cost_breakdown: cost,
      rate_version_id: rate.version_id,
      waste_stream: wasteStream,
    };
  });
}

function streamDiversionValue(stream, availableFacilities, currentPos) {
  // For each stream, find cheapest open facility; include detour as extra distance.
  const candidates = availableFacilities.filter((f) => f.accepted_streams?.includes(stream));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => haversineKm(currentPos, { lat: a.lat, lng: a.lng }) - haversineKm(currentPos, { lat: b.lat, lng: b.lng }));
  return { facility: candidates[0], extraKm: haversineKm(currentPos, { lat: candidates[0].lat, lng: candidates[0].lng }) };
}

export async function evaluateDiversion({ items, weightKg, currentPos, vehiclePos, asOf, client = supabaseAdmin }) {
  const classified = classifyItems(items);
  const { data: facilities } = await client.from('facilities').select('*').eq('is_active', true);
  const available = facilities || [];

  const splits = [];
  for (const group of classified) {
    const diversion = streamDiversionValue(group.stream, available, currentPos);
    if (!diversion) continue;
    const rate = await resolveFacilityRate({ facility: diversion.facility.name, wasteStream: group.stream, asOf, client });
    const cost = calculateDisposalCost({ netWeightKg: (weightKg * group.count) / Math.max(classified.reduce((s, g) => s + g.count, 0), 1), rate, surcharges: rate.surcharges, itemFees: rate.item_fees, items: group.items });
    const savingsVsGeneral = cost.total_cost_cents; // simplified; real savings would compare to general landfill cost
    const extraLaborMin = (diversion.extraKm / 50) * 60;
    const extraCost = Math.round(toCents(18 * 2) * (extraLaborMin / 60)); // two crew members @ $18/h
    const savingsCents = Math.max(0, savingsVsGeneral - extraCost);
    const worthIt = savingsCents > 0;
    splits.push({
      stream: group.stream,
      items: group.items,
      facility: diversion.facility,
      predicted_cost_cents: cost.total_cost_cents,
      extra_km: Math.round(diversion.extraKm * 10) / 10,
      extra_labor_min: Math.round(extraLaborMin),
      extra_cost_cents: extraCost,
      savings_cents: savingsCents,
      recommend: worthIt,
    });
  }
  return splits.sort((a, b) => b.savings_cents - a.savings_cents);
}

export async function createDisposalRun({
  assignmentId,
  routePlanId,
  facilityId,
  wasteStream = DEFAULT_STREAM,
  bookingIds = [],
  items = [],
  weightKg,
  predictedCostCents,
  client = supabaseAdmin,
}) {
  const run = {
    assignment_id: assignmentId,
    route_plan_id: routePlanId,
    facility_id: facilityId,
    waste_stream: wasteStream,
    booking_ids: bookingIds,
    predicted_kg: weightKg,
    predicted_cost_cents: predictedCostCents,
    status: 'predicted',
  };
  const { data, error } = await client.from('disposal_runs').insert(run).select().single();
  if (error) throw error;
  return data;
}

export async function recordScaleTicket({
  disposalRunId,
  inboundWeightKg,
  outboundWeightKg,
  wasteClass,
  facilityFeeCents,
  surchargeCents = 0,
  photoUrl,
  receiptUrl,
  ocrRaw = {},
  client = supabaseAdmin,
}) {
  const net = Number(inboundWeightKg || 0) - Number(outboundWeightKg || 0);
  const total = Number(facilityFeeCents || 0) + Number(surchargeCents || 0);
  const ticket = {
    disposal_run_id: disposalRunId,
    inbound_weight_kg: inboundWeightKg,
    outbound_weight_kg: outboundWeightKg,
    net_weight_kg: net,
    waste_class: wasteClass,
    facility_fee_cents: facilityFeeCents,
    surcharge_cents: surchargeCents,
    total_cost_cents: total,
    photo_url: photoUrl,
    receipt_url: receiptUrl,
    ocr_status: 'pending',
    ocr_raw: ocrRaw,
  };

  // Simple OCR conflict detection: if OCR provides values and they differ materially from crew-entered.
  const ocrInbound = ocrRaw.inbound_weight_kg ? Number(ocrRaw.inbound_weight_kg) : null;
  const ocrNet = ocrRaw.net_weight_kg ? Number(ocrRaw.net_weight_kg) : null;
  const ocrCost = ocrRaw.total_cost_cents ? Number(ocrRaw.total_cost_cents) : null;
  const conflicts = [];
  if (ocrInbound !== null && Math.abs(ocrInbound - Number(inboundWeightKg || 0)) > 10) conflicts.push('inbound_weight');
  if (ocrNet !== null && Math.abs(ocrNet - net) > 10) conflicts.push('net_weight');
  if (ocrCost !== null && Math.abs(ocrCost - total) > toCents(5)) conflicts.push('total_cost');

  ticket.ocr_status = conflicts.length > 0 ? 'conflict' : 'success';

  const { data, error } = await client.from('disposal_tickets').insert(ticket).select().single();
  if (error) throw error;

  const { data: run } = await client.from('disposal_runs').select('*').eq('id', disposalRunId).single();
  if (run) {
    await client.from('disposal_runs').update({
      actual_kg: net,
      actual_cost_cents: total,
      status: 'actual_pending',
    }).eq('id', disposalRunId);
  }

  const alerts = await generateAlerts({ run, ticket, client });
  return { ticket, alerts };
}

export async function verifyTicket({ ticketId, verifiedBy, reason, correctedValues = {}, client = supabaseAdmin }) {
  const { data: ticket } = await client.from('disposal_tickets').select('*').eq('id', ticketId).single();
  if (!ticket) throw new Error('Ticket not found');

  const update = {
    ocr_status: 'verified',
    verified_by: verifiedBy,
    verification_reason: reason,
    ...correctedValues,
  };

  const { data, error } = await client.from('disposal_tickets').update(update).eq('id', ticketId).select().single();
  if (error) throw error;

  const { data: run } = await client.from('disposal_runs').select('*').eq('id', ticket.disposal_run_id).single();
  if (run) {
    const net = Number(data.inbound_weight_kg || 0) - Number(data.outbound_weight_kg || 0);
    const total = Number(data.facility_fee_cents || 0) + Number(data.surcharge_cents || 0);
    await client.from('disposal_runs').update({
      actual_kg: net,
      actual_cost_cents: total,
      status: 'verified',
    }).eq('id', run.id);

    await generateAlerts({ run: { ...run, actual_kg: net, actual_cost_cents: total }, ticket: data, client });
  }
  return data;
}

export async function reconcileDisposalRun(disposalRunId, client = supabaseAdmin) {
  const { data: run } = await client.from('disposal_runs').select('*, disposal_tickets(*)').eq('id', disposalRunId).single();
  if (!run) throw new Error('Disposal run not found');

  const variance = {
    weight_kg: Number(run.actual_kg || 0) - Number(run.predicted_kg || 0),
    cost_cents: Number(run.actual_cost_cents || 0) - Number(run.predicted_cost_cents || 0),
    cost_percent: run.predicted_cost_cents ? ((Number(run.actual_cost_cents || 0) - Number(run.predicted_cost_cents || 0)) / Number(run.predicted_cost_cents)) * 100 : 0,
  };

  return {
    run,
    variance,
    model_performance: {
      weight_error_kg: variance.weight_kg,
      cost_error_cents: variance.cost_cents,
      cost_error_percent: Math.round(variance.cost_percent * 10) / 10,
    },
  };
}

export async function generateAlerts({ run, ticket, client = supabaseAdmin }) {
  const alerts = [];

  // Facility mismatch.
  if (run.facility_id && ticket.waste_class && ticket.waste_class !== run.waste_stream) {
    alerts.push({
      disposal_run_id: run.id,
      alert_type: 'wrong_facility',
      severity: 'high',
      message: `Ticket waste class ${ticket.waste_class} does not match predicted stream ${run.waste_stream}`,
    });
  }

  // Surcharge alert.
  if (Number(ticket.surcharge_cents || 0) > toCents(25)) {
    alerts.push({
      disposal_run_id: run.id,
      alert_type: 'surcharge',
      severity: 'medium',
      message: `Disposal surcharge $${fromCents(ticket.surcharge_cents).toFixed(2)} exceeds $25`,
    });
  }

  // Weight beyond operating limit.
  if (Number(run.actual_kg || 0) > 2500) {
    alerts.push({
      disposal_run_id: run.id,
      alert_type: 'weight_limit',
      severity: 'high',
      message: `Actual net weight ${run.actual_kg} kg exceeds conservative 2,500 kg operating limit`,
    });
  }

  // Cost variance.
  if (run.predicted_cost_cents && run.actual_cost_cents) {
    const diff = Number(run.actual_cost_cents) - Number(run.predicted_cost_cents);
    const pct = Number(run.predicted_cost_cents) ? (diff / Number(run.predicted_cost_cents)) * 100 : 0;
    if (Math.abs(pct) > 20) {
      alerts.push({
        disposal_run_id: run.id,
        alert_type: 'cost_variance',
        severity: Math.abs(pct) > 50 ? 'high' : 'medium',
        message: `Actual cost $${fromCents(run.actual_cost_cents).toFixed(2)} is ${pct > 0 ? '+' : ''}${Math.round(pct)}% vs predicted $${fromCents(run.predicted_cost_cents).toFixed(2)}`,
      });
    }
  }

  if (alerts.length > 0) {
    const { error } = await client.from('disposal_alerts').insert(alerts);
    if (error) throw error;
    await client.from('disposal_runs').update({ status: 'flagged' }).eq('id', run.id);
  }
  return alerts;
}
