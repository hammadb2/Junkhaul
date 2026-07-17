import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { captureAttribution } from '@/lib/attribution';
import { upsertSmsConsent } from '@/lib/sms';
import { newResumeToken, hashToken } from '@/lib/donationPhotos';
import { recordTimelineEvent } from '@/lib/timeline';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { session_id, name = null, phone, email = null, address = null, attribution = {}, sms_consent_source = 'donation_draft' } = body;
    if (!session_id || !phone) return NextResponse.json({ error: 'session_id and phone are required.' }, { status: 400 });

    const normalizedPhone = normalizePhone(phone);
    const token = newResumeToken();
    await upsertSmsConsent({ phone: normalizedPhone || phone, consent_source: sms_consent_source });

    const { data: existing } = await supabaseAdmin
      .from('donation_requests')
      .select('id, request_ref, resume_token_hash, status')
      .eq('session_id', session_id)
      .in('status', ['draft', 'needs_more_photos'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let request = existing;
    if (!request) {
      const { data, error } = await supabaseAdmin.from('donation_requests').insert({
        session_id,
        name,
        phone: normalizedPhone || phone,
        normalized_phone: normalizedPhone,
        email,
        address,
        resume_token_hash: hashToken(token),
        sms_consent_source,
        sms_consent_at: new Date().toISOString(),
        status: 'draft',
        last_completed_step: 'phone',
        last_activity_at: new Date().toISOString(),
      }).select('id, request_ref, status').single();
      if (error) throw error;
      request = data;
    } else {
      await supabaseAdmin.from('donation_requests').update({
        name,
        phone: normalizedPhone || phone,
        normalized_phone: normalizedPhone,
        email,
        address,
        resume_token_hash: hashToken(token),
        last_activity_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }

    await captureAttribution({
      session_id,
      donation_request_id: request.id,
      touch: { ...attribution, landing_path: attribution.landing_path || '/book/donation', source: attribution.source || 'web' },
    });
    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: request.id,
      event_type: 'donation_draft_started',
      actor_type: 'customer',
      source: 'donation_form',
      metadata: { session_id },
    });

    return NextResponse.json({ ok: true, donation_request_id: request.id, request_ref: request.request_ref, token });
  } catch (err) {
    console.error('donation draft failed:', err);
    return NextResponse.json({ error: 'Could not start donation request.' }, { status: 500 });
  }
}
