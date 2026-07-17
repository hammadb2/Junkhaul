import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission, jsonForbidden } from '@/lib/staffAuth';
import { findBestRouteFit, saveRouteFitResult } from '@/lib/donationRouteFit';
import { assertManagerScopeForCrewAssignment } from '@/lib/donationManagerScope';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

// GET: route-fit evaluation history + alternatives for this donation request.
export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, { permission: 'donations.route_match', entityType: 'donation_request', entityId: id, action: 'donations.route_fit.read' });
  if (!auth.ok) return auth.response;

  const { data: matches } = await supabaseAdmin.from('donation_route_matches').select('*').eq('donation_request_id', id).order('created_at', { ascending: false });
  return NextResponse.json({ route_matches: matches || [] });
}

// POST: { crew_assignment_ids: string[], destination_score_id? }
// Evaluates every candidate crew_assignment (each must be within the
// caller's manager scope unless owner/admin) and saves the best result
// as a new donation_route_matches candidate row.
export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { crew_assignment_ids = [], destination_score_id = null } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.route_match',
    entityType: 'donation_request',
    entityId: id,
    action: 'donations.route_fit.evaluate',
  });
  if (!auth.ok) return auth.response;

  if (!crew_assignment_ids.length) return NextResponse.json({ error: 'crew_assignment_ids is required' }, { status: 422 });

  const { data: crewAssignments } = await supabaseAdmin.from('crew_assignments').select('*').in('id', crew_assignment_ids);
  for (const crewAssignment of crewAssignments || []) {
    const allowed = await assertManagerScopeForCrewAssignment(auth.context, crewAssignment);
    if (!allowed) return jsonForbidden();
  }

  let destinationCandidate = null;
  if (destination_score_id) {
    const { data: score } = await supabaseAdmin.from('donation_destination_scores').select('*').eq('id', destination_score_id).eq('donation_request_id', id).maybeSingle();
    destinationCandidate = score || null;
  }

  const result = await findBestRouteFit({ donationRequestId: id, candidateCrewAssignmentIds: crew_assignment_ids, destinationCandidate });
  const saved = await saveRouteFitResult({ donationRequestId: id, result, createdBy: auth.context.employee.id });

  await recordTimelineEvent({
    entity_type: 'donation_request',
    entity_id: id,
    event_type: 'donation_route_fit_evaluated',
    actor_type: 'employee',
    actor_id: auth.context.employee.id,
    source: 'admin_donation_review',
    after: { decision: result.decision, crew_assignment_id: result.crew_assignment_id, route_match_id: saved.id },
    metadata: { candidates_evaluated: crew_assignment_ids.length, reasons: result.reasons },
  });

  return NextResponse.json({ result, route_match: saved });
}
