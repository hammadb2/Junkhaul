import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { upsertSmsConsent, sendSMS } from '@/lib/sms';
import { captureAttribution } from '@/lib/attribution';
import { validateDonationPhotos, analyzeDonationSubmission } from '@/lib/donation';
import { assertDonationUploadAllowed, REQUIRED_DONATION_PHOTO_TYPES } from '@/lib/donationPhotos';
import { recordTimelineEvent } from '@/lib/timeline';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      session_id,
      donation_request_id = null,
      token = null,
      name,
      phone,
      email = null,
      address,
      unit = null,
      buzzer = null,
      access_instructions = null,
      availability = {},
      outside_pickup_permission = false,
      stairs = 0,
      elevator = null,
      parking = null,
      description = '',
      confirmations = {},
      attribution = {},
      sms_consent_source = 'donation_form',
    } = body;

    if (!phone || !address) return NextResponse.json({ error: 'Phone and address are required.' }, { status: 400 });
    assertRateLimit({ scope: 'donation_submit_ip', key: getClientKey(req, session_id || donation_request_id), limit: 10, windowMs: 60 * 60 * 1000 });
    assertRateLimit({ scope: 'donation_submit_phone', key: phone, limit: 4, windowMs: 60 * 60 * 1000 });
    if (!donation_request_id || !token) {
      return NextResponse.json({ error: 'Start a donation draft and upload photos before submitting.' }, { status: 400 });
    }
    await assertDonationUploadAllowed({ donationRequestId: donation_request_id, token });
    const { data: storedPhotos } = await supabaseAdmin
      .from('donation_request_photos')
      .select('*')
      .eq('donation_request_id', donation_request_id)
      .is('removed_at', null)
      .order('upload_order', { ascending: true });
    const photoCheck = validateDonationPhotos(storedPhotos || [], REQUIRED_DONATION_PHOTO_TYPES);
    if (!photoCheck.ok) {
      return NextResponse.json({ error: 'Missing required donation photos.', missing_photos: photoCheck.missing }, { status: 400 });
    }

    const requiredConfirmations = [
      'confirmation_photos_accurate',
      'confirmation_items_clean',
      'confirmation_items_usable',
      'confirmation_no_garbage',
      'confirmation_no_hazmat',
    ];
    const missingConfirmations = requiredConfirmations.filter((k) => confirmations[k] !== true);
    if (missingConfirmations.length) {
      return NextResponse.json({ error: 'Donation quality confirmations are required.', missing_confirmations: missingConfirmations }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    await upsertSmsConsent({ phone: normalizedPhone, consent_source: sms_consent_source });

    const { data: policy } = await supabaseAdmin
      .from('donation_policy_versions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: request, error } = await supabaseAdmin
      .from('donation_requests')
      .update({
        name,
        phone: normalizedPhone || phone,
        normalized_phone: normalizedPhone,
        email,
        address,
        unit,
        buzzer,
        access_instructions,
        availability,
        outside_pickup_permission,
        stairs,
        elevator,
        parking,
        description,
        confirmation_photos_accurate: confirmations.confirmation_photos_accurate,
        confirmation_items_clean: confirmations.confirmation_items_clean,
        confirmation_items_usable: confirmations.confirmation_items_usable,
        confirmation_no_garbage: confirmations.confirmation_no_garbage,
        confirmation_no_hazmat: confirmations.confirmation_no_hazmat,
        sms_consent_source,
        sms_consent_at: new Date().toISOString(),
        policy_version_id: policy?.id || null,
        status: 'submitted',
        last_completed_step: 'submitted',
        last_activity_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .eq('id', donation_request_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const analysis = analyzeDonationSubmission({ description, photos: storedPhotos || [], confirmations });
    const nextStatus = analysis.outcome === 'NEED_MORE_PHOTOS'
      ? 'needs_more_photos'
      : analysis.outcome === 'OFFER_PAID_JUNK_REMOVAL'
        ? 'paid_quote_offered'
        : 'manual_review';

    await supabaseAdmin.from('donation_ai_analyses').insert({
      donation_request_id: request.id,
      provider: 'internal',
      model: 'donation-policy-v1',
      prompt_version: 'donation-v1',
      donation_policy_version_id: policy?.id || null,
      raw_output: analysis,
      structured_output: analysis.structured_output || {},
      confidence: analysis.confidence,
      rejection_reasons: analysis.rejection_reasons || [],
      item_level_decisions: [],
    });

    await supabaseAdmin.from('donation_requests').update({
      status: nextStatus,
      ai_outcome: analysis.outcome,
      confidence: analysis.confidence,
      status_reason: (analysis.rejection_reasons || analysis.missing_photos || []).join(', ') || null,
    }).eq('id', request.id);

    const attr = session_id ? await captureAttribution({
      session_id,
      donation_request_id: request.id,
      touch: {
        ...attribution,
        landing_path: attribution.landing_path || '/book/donation',
        source: attribution.source || 'web',
      },
    }) : null;

    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: request.id,
      event_type: 'donation_submitted',
      actor_type: 'customer',
      source: 'donation_form',
      metadata: { photo_count: storedPhotos?.length || 0, ai_outcome: analysis.outcome, first_touch_id: attr?.first?.id || null },
    });
    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: request.id,
      event_type: 'donation_transition',
      source: 'donation_ai',
      before: { status: 'submitted' },
      after: { status: nextStatus },
      reason: analysis.outcome,
      metadata: analysis,
    });

    try {
      await sendSMS(normalizedPhone || phone, 'We received your donation pickup request. This is not a confirmed pickup yet — we review item quality and route fit first. We’ll text the next step shortly. — Junk Haul Calgary', {
        donation_request_id: request.id,
        message_type: 'donation_submission_received',
        workflow_action: 'donation_received',
      });
    } catch {
      // visible in messages table via central SMS failure logging
    }

    return NextResponse.json({ ok: true, donation_request_id: request.id, request_ref: request.request_ref, status: nextStatus });
  } catch (err) {
    console.error('donation request failed:', err);
    return NextResponse.json(
      { error: err.status === 429 ? err.message : 'Could not submit donation request.' },
      { status: err.status || 500, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }
}
