import { NextResponse } from 'next/server';
import { analyzeItemEvidence } from '@/lib/itemEvidence';

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
