import { NextResponse } from 'next/server';
import { analyzeItemEvidence } from '@/lib/itemEvidence';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// POST /api/item-evidence/analyze
// Body: { booking_id, session_id, photos_base64[], description, existing_capture_stages[] }
export async function POST(req) {
  try {
    const body = await req.json();
    const { booking_id, session_id, photos_base64 = [], description = '', existing_capture_stages = [] } = body;
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    // Unauthenticated AI vision on caller-supplied photos, no rate limit
    // (audit I1) -- same cost-abuse class as B10 (chat-booking, photo-quote).
    // No session/ownership check exists for this endpoint yet, so this is
    // the proportionate fix rather than building new auth infrastructure.
    try {
      assertRateLimit({ scope: 'item_evidence_booking', key: booking_id, limit: 10, windowMs: 60 * 60 * 1000 });
      assertRateLimit({ scope: 'item_evidence_ip', key: getClientKey(req), limit: 20, windowMs: 60 * 60 * 1000 });
    } catch (err) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: err.status || 429, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
      );
    }

    const result = await analyzeItemEvidence({
      bookingId: booking_id,
      sessionId: session_id,
      photosBase64: photos_base64,
      description,
      existingCaptureStages: existing_capture_stages,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
