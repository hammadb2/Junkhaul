import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST: Send a verification code via SMS
export async function POST(req) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

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
