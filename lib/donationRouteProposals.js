// ============================================================
// DONATION ROUTE PROPOSALS — versioned, human-approved route changes
//
// The route-fit engine (lib/donationRouteFit.js) only ever produces a
// candidate decision. Nothing here lets an AI recommendation silently
// become the live route: a proposal is created against a specific
// source_route_version snapshot, and only requireStaffPermission-gated
// manager/admin approval creates a brand new route_plans row. Approval
// against a stale source version is rejected outright.
// ============================================================

import { supabaseAdmin } from './supabase';
import { getNumberConfig } from './config';
import { recordTimelineEvent } from './timeline';
import { recordAuditEvent } from './auditEvents';
import { assertDonationTransition } from './donation';

export const ROUTE_PROPOSAL_STATUSES = ['pending', 'approved', 'rejected', 'held', 'expired', 'stale'];

function buildDonationStop(donationRequest, capacity, destination) {
  return {
    id: `donation_${donationRequest.id}`,
    type: 'donation_pickup',
    status: 'proposed',
    donation_request_id: donationRequest.id,
    request_ref: donationRequest.request_ref,
    name: donationRequest.name,
    address: donationRequest.address,
    lat: donationRequest.lat,
    lng: donationRequest.lng,
    pickup_duration_minutes: capacity?.pickup_duration_minutes ?? null,
    loading_duration_minutes: capacity?.loading_duration_minutes ?? null,
    destination: destination ? { destination_type: destination.destination_type, destination_id: destination.destination_id, destination_name: destination.destination_name } : null,
  };
}

function insertStopAt(stops, index, stop) {
  const next = [...stops];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, stop);
  next.forEach((s, idx) => { s.sequence = idx + 1; });
  return next;
}

// ------------------------------------------------------------
// createRouteProposal — snapshots the current route, computes the
// proposed route with the donation stop inserted, and stores both so
// approval later has an exact before/after diff.
// ------------------------------------------------------------
export async function createRouteProposal({ donationRequestId, routeFitResult, routeMatchId = null, capacity = null, destination = null, actorId = null }) {
  if (!['fits_current_route', 'fits_with_modification'].includes(routeFitResult.decision)) {
    throw new Error(`Cannot create a route proposal for decision "${routeFitResult.decision}"`);
  }

  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('*').eq('id', donationRequestId).single();
  if (!donationRequest) throw new Error('Donation request not found');

  const { data: routePlan } = await supabaseAdmin.from('route_plans').select('*').eq('id', routeFitResult.route_plan_id).single();
  if (!routePlan) throw new Error('Source route plan not found');
  if (routePlan.route_version !== routeFitResult.route_version) {
    throw new Error('Route version has moved since evaluation; re-run route-fit before proposing');
  }

  const beforeStops = Array.isArray(routePlan.stops) ? routePlan.stops : [];
  const donationStop = buildDonationStop(donationRequest, capacity, destination);
  const proposedStops = insertStopAt(beforeStops, routeFitResult.best_insertion_index ?? beforeStops.length, donationStop);

  const expiryMinutes = await getNumberConfig('donation_route_proposal_expiry_minutes', 240);

  const { data: proposal, error } = await supabaseAdmin
    .from('donation_route_proposals')
    .insert({
      donation_request_id: donationRequestId,
      donation_route_match_id: routeMatchId,
      crew_assignment_id: routeFitResult.crew_assignment_id,
      source_route_plan_id: routePlan.id,
      source_route_version: routePlan.route_version,
      proposed_stop: donationStop,
      proposed_insertion_index: routeFitResult.best_insertion_index ?? beforeStops.length,
      capacity_calculations: capacity || {},
      timing_calculations: {
        added_drive_minutes: routeFitResult.added_drive_minutes,
        added_labour_minutes: routeFitResult.added_labour_minutes,
        paid_job_delay_risk: routeFitResult.paid_job_delay_risk,
        max_delay_minutes: routeFitResult.max_delay_minutes,
      },
      destination_id: destination?.destination_id || null,
      reasons: routeFitResult.reasons || [],
      model_version: 'donation-route-fit-v1',
      before_route: beforeStops,
      proposed_route: proposedStops,
      status: 'pending',
      created_by: actorId,
      expires_at: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: donationRequestId,
    event_type: 'donation_route_proposal_created',
    actor_type: actorId ? 'employee' : 'system',
    actor_id: actorId,
    source: 'donation_route_fit',
    after: { proposal_id: proposal.id, decision: routeFitResult.decision },
    metadata: { route_fit_result: routeFitResult },
  });

  return proposal;
}

async function expireIfStale(proposal) {
  if (proposal.status !== 'pending') return proposal;
  if (proposal.expires_at && new Date(proposal.expires_at).getTime() < Date.now()) {
    const { data } = await supabaseAdmin.from('donation_route_proposals').update({ status: 'expired' }).eq('id', proposal.id).select().single();
    return data;
  }
  return proposal;
}

// ------------------------------------------------------------
// approveRouteProposal — the ONLY path that creates a new route_plans
// version from a donation proposal. Re-validates the source route
// version is still current; a stale proposal is rejected, not silently
// applied against a route the crew/dispatch has already moved past.
// ------------------------------------------------------------
export async function approveRouteProposal({ proposalId, actorId, reason = null }) {
  const { data: proposal } = await supabaseAdmin.from('donation_route_proposals').select('*').eq('id', proposalId).single();
  if (!proposal) throw new Error('Route proposal not found');
  const current = await expireIfStale(proposal);
  if (current.status !== 'pending') throw new Error(`Cannot approve a proposal with status "${current.status}"`);

  const { data: liveRoutePlan } = await supabaseAdmin
    .from('route_plans')
    .select('*')
    .eq('crew_assignment_id', current.crew_assignment_id)
    .order('route_version', { ascending: false })
    .limit(1)
    .single();

  if (!liveRoutePlan || liveRoutePlan.route_version !== current.source_route_version) {
    await supabaseAdmin.from('donation_route_proposals').update({ status: 'stale', rejection_reason: 'source_route_version_changed' }).eq('id', proposalId);
    throw new Error('stale_proposal_rejected: source route version has changed since this proposal was created');
  }

  const nextVersion = liveRoutePlan.route_version + 1;
  const { data: newRoutePlan, error: routeErr } = await supabaseAdmin
    .from('route_plans')
    .insert({
      crew_assignment_id: current.crew_assignment_id,
      route_version: nextVersion,
      crew_id: liveRoutePlan.crew_id,
      current_stop_id: liveRoutePlan.current_stop_id,
      stops: current.proposed_route,
      decision_reason: `Donation pickup ${current.donation_request_id} approved by manager${reason ? `: ${reason}` : ''}.`,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (routeErr) throw routeErr;

  const { data: approvedProposal, error: approveErr } = await supabaseAdmin
    .from('donation_route_proposals')
    .update({
      status: 'approved',
      approver_id: actorId,
      approved_at: new Date().toISOString(),
      approved_route: current.proposed_route,
      resulting_route_plan_id: newRoutePlan.id,
    })
    .eq('id', proposalId)
    .select()
    .single();
  if (approveErr) throw approveErr;

  if (current.donation_route_match_id) {
    await supabaseAdmin.from('donation_route_matches').update({ status: 'approved' }).eq('id', current.donation_route_match_id);
  }

  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('status').eq('id', current.donation_request_id).single();
  if (donationRequest && donationRequest.status !== 'route_matched') {
    assertDonationTransition(donationRequest.status, 'route_matched');
    await supabaseAdmin.from('donation_requests').update({ status: 'route_matched', reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq('id', current.donation_request_id);
  }

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: current.donation_request_id,
    event_type: 'donation_route_proposal_approved',
    actor_type: 'employee',
    actor_id: actorId,
    source: 'admin_donation_review',
    before: { route_plan_version: liveRoutePlan.route_version, stops: current.before_route },
    after: { route_plan_version: nextVersion, stops: current.proposed_route },
    reason,
    metadata: { proposal_id: proposalId, resulting_route_plan_id: newRoutePlan.id },
  });
  await recordAuditEvent({
    entity_type: 'donation_route_proposal',
    entity_id: proposalId,
    event_type: 'donation_route_proposal_approved',
    actor_type: 'employee',
    actor_id: actorId,
    source: 'admin_donation_review',
    before: { route_plan_id: liveRoutePlan.id, route_version: liveRoutePlan.route_version },
    after: { route_plan_id: newRoutePlan.id, route_version: nextVersion },
    reason,
  });

  return { proposal: approvedProposal, routePlan: newRoutePlan };
}

export async function rejectRouteProposal({ proposalId, actorId, reason }) {
  if (!reason) throw new Error('Rejection requires a reason');
  const { data: proposal } = await supabaseAdmin.from('donation_route_proposals').select('*').eq('id', proposalId).single();
  if (!proposal) throw new Error('Route proposal not found');
  if (proposal.status !== 'pending') throw new Error(`Cannot reject a proposal with status "${proposal.status}"`);

  const { data, error } = await supabaseAdmin
    .from('donation_route_proposals')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', proposalId)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: proposal.donation_request_id,
    event_type: 'donation_route_proposal_rejected',
    actor_type: 'employee',
    actor_id: actorId,
    source: 'admin_donation_review',
    reason,
    metadata: { proposal_id: proposalId },
  });
  return data;
}

export async function holdRouteProposal({ proposalId, actorId, reason = null }) {
  const { data: proposal } = await supabaseAdmin.from('donation_route_proposals').select('*').eq('id', proposalId).single();
  if (!proposal) throw new Error('Route proposal not found');
  if (proposal.status !== 'pending') throw new Error(`Cannot hold a proposal with status "${proposal.status}"`);

  const { data, error } = await supabaseAdmin
    .from('donation_route_proposals')
    .update({ status: 'held', rejection_reason: reason })
    .eq('id', proposalId)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: proposal.donation_request_id,
    event_type: 'donation_route_proposal_held',
    actor_type: 'employee',
    actor_id: actorId,
    source: 'admin_donation_review',
    reason,
    metadata: { proposal_id: proposalId },
  });
  return data;
}

// Batch-expire pending proposals past their expires_at. Safe to call
// from an admin GET/list route or a cron; idempotent.
export async function expireStaleRouteProposals() {
  const { data } = await supabaseAdmin
    .from('donation_route_proposals')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  return data || [];
}
