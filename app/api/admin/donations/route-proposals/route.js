import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission, jsonForbidden } from '@/lib/staffAuth';
import { createRouteProposal, expireStaleRouteProposals } from '@/lib/donationRouteProposals';
import { getEffectiveCapacityEstimate } from '@/lib/donationCapacity';
import { assertManagerScopeForCrewAssignment } from '@/lib/donationManagerScope';

export const runtime = 'nodejs';

// GET: list route proposals, optionally filtered by donation_request_id/status.
// Managers only see proposals for crew_assignments within their scope.
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'donations.route_match', action: 'donations.route_proposals.read' });
  if (!auth.ok) return auth.response;

  await expireStaleRouteProposals();

  const { searchParams } = new URL(req.url);
  const donationRequestId = searchParams.get('donation_request_id');
  const status = searchParams.get('status');

  let query = supabaseAdmin.from('donation_route_proposals').select('*, crew_assignments(assignment_date, driver_employee_id)').order('created_at', { ascending: false }).limit(100);
  if (donationRequestId) query = query.eq('donation_request_id', donationRequestId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (auth.context.roles.includes('owner') || auth.context.roles.includes('admin')) {
    return NextResponse.json({ proposals: data || [] });
  }

  const scoped = [];
  for (const proposal of data || []) {
    const allowed = await assertManagerScopeForCrewAssignment(auth.context, { id: proposal.crew_assignment_id, assignment_date: proposal.crew_assignments?.assignment_date });
    if (allowed) scoped.push(proposal);
  }
  return NextResponse.json({ proposals: scoped });
}

// POST: { donation_request_id, donation_route_match_id }
// Creates a proposal from a route-fit "candidate" row that decided
// fits_current_route or fits_with_modification.
export async function POST(req) {
  const body = await req.json();
  const { donation_request_id, donation_route_match_id } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.route_match',
    entityType: 'donation_request',
    entityId: donation_request_id || null,
    action: 'donations.route_proposals.create',
  });
  if (!auth.ok) return auth.response;

  if (!donation_request_id || !donation_route_match_id) {
    return NextResponse.json({ error: 'donation_request_id and donation_route_match_id are required' }, { status: 422 });
  }

  const { data: match } = await supabaseAdmin.from('donation_route_matches').select('*').eq('id', donation_route_match_id).eq('donation_request_id', donation_request_id).maybeSingle();
  if (!match) return NextResponse.json({ error: 'Route match not found' }, { status: 404 });

  const { data: crewAssignment } = await supabaseAdmin.from('crew_assignments').select('*').eq('id', match.crew_assignment_id).maybeSingle();
  const allowed = await assertManagerScopeForCrewAssignment(auth.context, crewAssignment);
  if (!allowed) return jsonForbidden();

  const capacity = await getEffectiveCapacityEstimate(donation_request_id);
  let destination = null;
  if (match.destination_score_id) {
    const { data: score } = await supabaseAdmin.from('donation_destination_scores').select('*').eq('id', match.destination_score_id).maybeSingle();
    destination = score || null;
  }

  try {
    const proposal = await createRouteProposal({
      donationRequestId: donation_request_id,
      routeFitResult: match.route_fit_result || match,
      routeMatchId: match.id,
      capacity,
      destination,
      actorId: auth.context.employee.id,
    });
    return NextResponse.json({ proposal });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
}
