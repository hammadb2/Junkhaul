import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// ============================================================
// REFERRAL API
//
// GET /api/referral?phone=+1... — look up referral status for a
//   customer (what they've earned, what they can share)
//
// POST /api/referral — process a referral fulfillment
//   { action: 'fulfill', booking_id } — marks the referral as
//   completed when the referred booking is done, sends reward
//   notifications to both referrer and referee
//
// POST /api/referral — validate a referral code
//   { action: 'validate', referral_code } — checks if the code
//   (phone number) belongs to an existing customer
// ============================================================

export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const phone = searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  // Get referrals where this customer is the referrer
  const { data: referrerReferrals } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .eq('referrer_phone', phone)
    .order('created_at', { ascending: false });

  // Get referrals where this customer is the referee
  const { data: refereeReferrals } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .eq('referee_phone', phone)
    .order('created_at', { ascending: false });

  const completedAsReferrer = (referrerReferrals || []).filter((r) => r.status === 'completed');
  const totalEarned = completedAsReferrer.reduce((s, r) => s + r.referrer_reward_amount, 0);

  return NextResponse.json({
    as_referrer: referrerReferrals || [],
    as_referee: refereeReferrals || [],
    total_referrals: (referrerReferrals || []).length,
    completed_referrals: completedAsReferrer.length,
    total_earned: totalEarned,
    referral_code: phone, // their phone IS their referral code
  });
}

export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  // ── Validate a referral code ───────────────────────────
  if (action === 'validate') {
    const { referral_code } = body;
    if (!referral_code) {
      return NextResponse.json({ error: 'referral_code required' }, { status: 400 });
    }

    // Normalize to phone format if it's a 10-digit number
    const refPhone = referral_code.replace(/\D/g, '').length === 10
      ? `+1${referral_code.replace(/\D/g, '')}`
      : referral_code;

    // Check if this phone belongs to an existing customer
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, name')
      .eq('phone', refPhone)
      .limit(1);

    const isValid = (existingBookings || []).length > 0;

    return NextResponse.json({
      valid: isValid,
      referrer_name: isValid ? existingBookings[0].name?.split(' ')[0] : null,
      message: isValid
        ? `You and ${existingBookings[0].name?.split(' ')[0] || 'your friend'} both get $20 off!`
        : 'Referral code not found. Make sure you entered their phone number correctly.',
    });
  }

  // ── Fulfill a referral (when the referred job completes) ──
  if (action === 'fulfill') {
    const { booking_id } = body;
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    }

    // Find the pending referral for this booking
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!referral) {
      return NextResponse.json({ ok: true, message: 'No pending referral for this booking' });
    }

    // Verify the booking is actually completed
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('status, name, phone')
      .eq('id', booking_id)
      .maybeSingle();

    if (!booking || booking.status !== 'completed') {
      return NextResponse.json({ ok: true, message: 'Booking not yet completed' });
    }

    // Mark referral as completed
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('referrals')
      .update({ status: 'completed', completed_at: now })
      .eq('id', referral.id);

    // Notify the referrer: they've earned $20 off their next booking
    try {
      await sendSMS(
        referral.referrer_phone,
        `Great news! Your friend ${booking.name?.split(' ')[0] || ''} just completed their Junk Haul Calgary pickup. You've earned $20 off your next booking! Just mention this text when you book again. Thanks for spreading the word!`,
        null,
        'referral_reward'
      );
    } catch {
      // best-effort
    }

    // Notify the referee: they've earned $20 off their next booking too
    try {
      await sendSMS(
        referral.referee_phone,
        `Thanks for choosing Junk Haul Calgary! You've earned $20 off your next pickup as part of our referral program. Just mention this text when you book again. See you next time!`,
        booking_id,
        'referral_reward'
      );
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, referral_id: referral.id });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
