import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission, jsonForbidden } from '@/lib/staffAuth';
import { approveRouteProposal, rejectRouteProposal, holdRouteProposal } from '@/lib/donationRouteProposals';
import { assertManagerScopeForCrewAssignment } from '@/lib/donationManagerScope';

export const runtime = 'nodejs';

// POST: { action: 'approve' | 'reject' | 'hold', reason }
export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { action, reason = null } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.route_match',
    entityType: 'donation_route_proposal',
    entityId: id,
    action: `donations.route_proposals.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;

  const { data: proposal } = await supabaseAdmin.from('donation_route_proposals').select('*').eq('id', id).maybeSingle();
  if (!proposal) return NextResponse.json({ error: 'Route proposal not found' }, { status: 404 });

  const { data: crewAssignment } = await supabaseAdmin.from('crew_assignments').select('*').eq('id', proposal.crew_assignment_id).maybeSingle();
  const allowed = await assertManagerScopeForCrewAssignment(auth.context, crewAssignment);
  if (!allowed) return jsonForbidden();

  try {
    if (action === 'approve') {
      const { proposal: updated, routePlan } = await approveRouteProposal({ proposalId: id, actorId: auth.context.employee.id, reason });
      return NextResponse.json({ proposal: updated, route_plan: routePlan });
    }
    if (action === 'reject') {
      const updated = await rejectRouteProposal({ proposalId: id, actorId: auth.context.employee.id, reason });
      return NextResponse.json({ proposal: updated });
    }
    if (action === 'hold') {
      const updated = await holdRouteProposal({ proposalId: id, actorId: auth.context.employee.id, reason });
      return NextResponse.json({ proposal: updated });
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (e) {
    const status = e.message?.startsWith('stale_proposal_rejected') ? 409 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
