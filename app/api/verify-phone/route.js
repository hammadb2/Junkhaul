import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { assertRateLimit, getClientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// POST: Send a verification code via SMS
export async function POST(req) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

  // Unauthenticated, phone-triggered SMS send -- without a limit this is an
  // open relay for SMS bombing/cost abuse (audit B10). Phone-scoped stops
  // hammering one number; IP-scoped stops one caller cycling through many
  // numbers.
  try {
    assertRateLimit({ scope: 'verify_phone_send_phone', key: phone, limit: 3, windowMs: 10 * 60 * 1000 });
    assertRateLimit({ scope: 'verify_phone_send_ip', key: getClientKey(req), limit: 10, windowMs: 60 * 60 * 1000 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Too many verification requests. Please try again later.' },
      { status: err.status || 429, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

  // Store code in Supabase
  const { error } = await supabaseAdmin
    .from('phone_verifications')
    .upsert({ phone, code, expires_at: expiresAt, verified: false, created_at: new Date().toISOString() });

  if (error) {
    // If table doesn't exist, just log and continue — non-blocking
    console.error('phone_verifications error:', error.message);
    return NextResponse.json({ ok: false, error: 'verification_unavailable' });
  }

  // Send SMS via the existing Quo SMS infrastructure (lib/sms.js)
  try {
    await sendSMS(
      phone,
      `Your Junkhaul verification code is ${code}`,
      null,
      'phone_verification'
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SMS OTP send failed:', e.message);
    return NextResponse.json({ ok: false, error: 'sms_failed' });
  }
}

// GET: Verify a code
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const code = searchParams.get('code');
  if (!phone || !code) return NextResponse.json({ error: 'phone and code required' }, { status: 400 });

  // A 6-digit code has only 1M combinations; without a limit on attempts
  // this is brute-forceable well within its 10-minute expiry (audit B10).
  try {
    assertRateLimit({ scope: 'verify_phone_check', key: phone, limit: 10, windowMs: 10 * 60 * 1000 });
  } catch (err) {
    return NextResponse.json(
      { verified: false, error: 'Too many attempts. Please request a new code.' },
      { status: err.status || 429, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('phone_verifications')
    .select('code, expires_at, verified')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ verified: false }, { status: 200 });
  if (data.verified) return NextResponse.json({ verified: true }, { status: 200 });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ verified: false, expired: true }, { status: 200 });
  if (data.code !== code) return NextResponse.json({ verified: false }, { status: 200 });

  // Mark as verified
  await supabaseAdmin
    .from('phone_verifications')
    .update({ verified: true })
    .eq('phone', phone);

  return NextResponse.json({ verified: true });
}
