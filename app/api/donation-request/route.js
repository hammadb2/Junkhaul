import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { upsertSmsConsent, sendSMS } from '@/lib/sms';
import { captureAttribution } from '@/lib/attribution';
import { validateDonationPhotos, analyzeDonationSubmission } from '@/lib/donation';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      session_id,
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
      photos = [],
      confirmations = {},
      attribution = {},
      sms_consent_source = 'donation_form',
    } = body;

    if (!phone || !address) return NextResponse.json({ error: 'Phone and address are required.' }, { status: 400 });
    const photoCheck = validateDonationPhotos(photos);
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
      .insert({
        session_id,
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
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const photoRows = photos.map((p, index) => ({
      donation_request_id: request.id,
      photo_type: p.photo_type || p.type,
      storage_url: p.storage_url || p.url,
      upload_order: index,
      file_size_bytes: p.file_size_bytes || null,
      width: p.width || null,
      height: p.height || null,
      sha256: p.sha256 || null,
      perceptual_hash: p.perceptual_hash || null,
      source_step: p.source_step || 'donation_form',
    }));
    await supabaseAdmin.from('donation_request_photos').insert(photoRows);

    const analysis = analyzeDonationSubmission({ description, photos, confirmations });
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
      metadata: { photo_count: photoRows.length, ai_outcome: analysis.outcome, first_touch_id: attr?.first?.id || null },
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
    return NextResponse.json({ error: 'Could not submit donation request.' }, { status: 500 });
  }
}
