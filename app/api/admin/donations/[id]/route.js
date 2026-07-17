import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { getEffectiveCapacityEstimate } from '@/lib/donationCapacity';

export const runtime = 'nodejs';

// Consolidated detail payload for the admin donation review UI: keeps
// AI recommendation and human decision visually separable on the
// client by returning both the raw analysis trail and the current
// donation_requests row (which only ever carries the human-reviewed
// status) side by side, plus everything else the reviewer needs in
// one request — capacity, destination scores, route-fit history,
// route proposals, Quo/message history, timeline, and audit history.
export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, { permission: 'donations.review', entityType: 'donation_request', entityId: id, action: 'donations.detail.read' });
  if (!auth.ok) return auth.response;

  const [
    { data: donation },
    { data: photos },
    { data: items },
    { data: analyses },
    { data: sufficiency },
    { data: destinationScores },
    { data: routeMatches },
    { data: routeProposals },
    { data: messages },
    { data: timeline },
    { data: audit },
    capacity,
  ] = await Promise.all([
    supabaseAdmin.from('donation_requests').select('*').eq('id', id).single(),
    supabaseAdmin.from('donation_request_photos').select('*').eq('donation_request_id', id).is('removed_at', null).order('upload_order', { ascending: true }),
    supabaseAdmin.from('donation_request_items').select('*').eq('donation_request_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('donation_ai_analyses').select('*').eq('donation_request_id', id).order('analysis_version', { ascending: false }),
    supabaseAdmin.from('donation_photo_sufficiency').select('*').eq('donation_request_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('donation_destination_scores').select('*').eq('donation_request_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('donation_route_matches').select('*').eq('donation_request_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('donation_route_proposals').select('*').eq('donation_request_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('messages').select('*').eq('donation_request_id', id).order('sent_at', { ascending: false }).limit(50),
    supabaseAdmin.from('timeline_events').select('*').eq('entity_type', 'donation_request').eq('entity_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('audit_events').select('*').eq('entity_type', 'donation_request').eq('entity_id', id).order('created_at', { ascending: true }),
    getEffectiveCapacityEstimate(id),
  ]);

  if (!donation) return NextResponse.json({ error: 'Donation request not found' }, { status: 404 });

  return NextResponse.json({
    donation,
    photos: photos || [],
    items: items || [],
    analyses: analyses || [],
    latest_analysis: analyses?.[0] || null,
    sufficiency: sufficiency || [],
    destination_scores: destinationScores || [],
    capacity_estimate: capacity,
    route_matches: routeMatches || [],
    route_proposals: routeProposals || [],
    messages: messages || [],
    timeline: timeline || [],
    audit: audit || [],
  });
}
