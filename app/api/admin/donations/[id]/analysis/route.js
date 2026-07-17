import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';
import { analyzeDonationPhotos } from '@/lib/donationVision';
import { evaluatePhotoSufficiency, requestAdditionalDonationPhotos, recordPhotoSufficiency } from '@/lib/donationPhotoSufficiency';
import { recordTimelineEvent } from '@/lib/timeline';
import { recordAuditEvent } from '@/lib/auditEvents';

export const runtime = 'nodejs';

// GET: analysis + item history for the review UI.
export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireStaffPermission(req, { permission: 'donations.review', entityType: 'donation_request', entityId: id, action: 'donations.analysis.read' });
  if (!auth.ok) return auth.response;

  const [{ data: analyses }, { data: items }, { data: sufficiency }] = await Promise.all([
    supabaseAdmin.from('donation_ai_analyses').select('*').eq('donation_request_id', id).order('analysis_version', { ascending: false }),
    supabaseAdmin.from('donation_request_items').select('*').eq('donation_request_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('donation_photo_sufficiency').select('*').eq('donation_request_id', id).order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ analyses: analyses || [], items: items || [], sufficiency: sufficiency || [] });
}

// POST: { action: 'run' | 'request_photos', description?, missing_evidence?, requested_photo_types?, reason? }
export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { action, description, missing_evidence = [], requested_photo_types = [], reason = null } = body;

  const auth = await requireStaffPermission(req, {
    permission: 'donations.review',
    entityType: 'donation_request',
    entityId: id,
    action: `donations.analysis.${action}`,
    reason,
  });
  if (!auth.ok) return auth.response;

  const { data: donationRequest } = await supabaseAdmin.from('donation_requests').select('*').eq('id', id).single();
  if (!donationRequest) return NextResponse.json({ error: 'Donation request not found' }, { status: 404 });

  if (action === 'run') {
    const { data: policy } = donationRequest.policy_version_id
      ? await supabaseAdmin.from('donation_policy_versions').select('*').eq('id', donationRequest.policy_version_id).maybeSingle()
      : { data: null };

    const result = await analyzeDonationPhotos({
      donationRequestId: id,
      description: description || donationRequest.description,
      trigger: 'manual_rerun',
      actorId: auth.context.employee.id,
    });

    const { data: photos } = await supabaseAdmin.from('donation_request_photos').select('*').eq('donation_request_id', id).is('removed_at', null);
    const sufficiency = evaluatePhotoSufficiency({ photos: photos || [], analysis: result.ai_recommendation, items: result.items, policy });

    if (sufficiency.status === 'more_photos_required') {
      await requestAdditionalDonationPhotos({
        donationRequestId: id,
        phone: donationRequest.phone,
        missingEvidence: sufficiency.missing_evidence,
        requestedPhotoTypes: sufficiency.requested_photo_types,
        donationAiAnalysisId: result.analysis.id,
        actorType: 'employee',
        actorId: auth.context.employee.id,
      });
    } else {
      await recordPhotoSufficiency({ donationRequestId: id, donationAiAnalysisId: result.analysis.id, status: sufficiency.status, missingEvidence: sufficiency.missing_evidence, requestedPhotoTypes: sufficiency.requested_photo_types });
    }

    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: id,
      event_type: 'donation_analysis_rerun',
      actor_type: 'employee',
      actor_id: auth.context.employee.id,
      source: 'admin_donation_review',
      reason,
      metadata: { analysis_id: result.analysis.id, ai_recommendation: result.ai_recommendation, sufficiency, fallback_used: result.fallback_used },
    });
    await recordAuditEvent({
      entity_type: 'donation_request',
      entity_id: id,
      event_type: 'donation_analysis_rerun',
      actor_type: 'employee',
      actor_id: auth.context.employee.id,
      source: 'admin_donation_review',
      reason,
      after: { analysis_id: result.analysis.id, ai_recommendation: result.ai_recommendation },
    });

    return NextResponse.json({ analysis: result.analysis, ai_recommendation: result.ai_recommendation, items: result.items, sufficiency });
  }

  if (action === 'request_photos') {
    if (!missing_evidence.length) return NextResponse.json({ error: 'missing_evidence is required to request specific photos' }, { status: 422 });
    const sufficiencyRow = await requestAdditionalDonationPhotos({
      donationRequestId: id,
      phone: donationRequest.phone,
      missingEvidence: missing_evidence,
      requestedPhotoTypes: requested_photo_types,
      actorType: 'employee',
      actorId: auth.context.employee.id,
    });
    await supabaseAdmin.from('donation_requests').update({ status: 'needs_more_photos', status_reason: reason || 'Additional photos requested' }).eq('id', id);
    await recordAuditEvent({
      entity_type: 'donation_request',
      entity_id: id,
      event_type: 'donation_photo_request_manual',
      actor_type: 'employee',
      actor_id: auth.context.employee.id,
      source: 'admin_donation_review',
      reason,
      after: { missing_evidence, requested_photo_types },
    });
    return NextResponse.json({ sufficiency: sufficiencyRow });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
