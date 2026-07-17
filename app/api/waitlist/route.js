import { NextResponse } from 'next/server';
import { addToWaitlist } from '@/lib/waitlist';
import { captureAttribution } from '@/lib/attribution';
import { upsertSmsConsent } from '@/lib/sms';
import { normalizePhone } from '@/lib/phone';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json();
  const { name, phone, preferred_day_type = 'either', load_size = null, address = null, session_id = null, attribution = {}, sms_consent_source = 'waitlist_form' } = body;
  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
  }
  try {
    const normalizedPhone = normalizePhone(phone);
    await upsertSmsConsent({ phone: normalizedPhone || phone, consent_source: sms_consent_source });
    const entry = await addToWaitlist({ name, phone: normalizedPhone || phone, preferred_day_type, load_size, address, session_id });
    if (session_id && entry?.id) {
      await captureAttribution({
        session_id,
        touch: { ...attribution, landing_path: attribution.landing_path || '/waitlist', source: attribution.source || 'web' },
      });
    }
    return NextResponse.json({ ok: true, waitlist_id: entry?.id || null });
  } catch (err) {
    console.error('waitlist add failed:', err);
    return NextResponse.json({ error: 'Could not add you to the waitlist.' }, { status: 500 });
  }
}
