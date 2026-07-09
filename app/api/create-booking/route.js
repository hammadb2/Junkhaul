import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculatePrice, PRICING, checkWeightFlag, LOAD_LABELS } from '@/lib/pricing';
import { geocodeAddress } from '@/lib/geocode';
import { createDepositPayment } from '@/lib/stripe';
import { jobDateTimeUTC, dayType, formatDateLong, formatTime } from '@/lib/dates';
import { sendSMS } from '@/lib/sms';
import { sendDepositLink } from '@/lib/messages';

export const runtime = 'nodejs';

const LOAD_ORDER = ['single_item', 'quarter', 'half', 'full'];

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email = null,
      address,
      unit = null,
      address_data = null,
      is_apartment = false,
      customer_notes = null,
      load_size,
      same_day = false,
      stairs = 0,
      has_freon = false,
      freon_count = 0,
      job_date,
      job_time,
      photos = [],
      photo_skipped = false,
      description_text = null,
      ai_load_estimate = null,
      ai_weight_estimate_kg = null,
      ai_confidence = null,
      has_hazmat = false,
      hazmat_description = null,
      flag_for_review = false,
      flag_reason = null,
      source = 'web',
      referral_code = null,
    } = body;

    // Required-field validation
    if (!name || !phone || !address || !load_size || !job_date || !job_time) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!LOAD_ORDER.includes(load_size)) {
      return NextResponse.json({ error: 'Invalid load size.' }, { status: 400 });
    }

    // Verify the slot still has capacity.
    const { data: slot } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('slot_date', job_date)
      .eq('slot_time', job_time)
      .maybeSingle();

    if (!slot || slot.jobs_booked >= slot.max_jobs || !slot.is_available) {
      return NextResponse.json(
        { error: 'That time slot was just taken. Please pick another.' },
        { status: 409 }
      );
    }

    // Price is ALWAYS computed server-side.
    const priced = calculatePrice({ load_size, same_day, stairs, has_freon, freon_count, job_date, job_time });

    // Geocode for dispatch/quadrant — use Mapbox data from frontend if available, else geocode
    let geo;
    if (address_data?.lat && address_data?.lng) {
      // Determine quadrant from lat/lng
      const isNorth = address_data.lat >= 51.0447;
      const isEast = address_data.lng >= -114.0719;
      const quadrant = `${isNorth ? 'NW' : 'SW'}${isEast ? 'E' : 'W'}`.replace(/(?<=[NS])W(?=E)/, '');
      // Simpler: just compute it
      const ns = address_data.lat >= 51.0447 ? 'N' : 'S';
      const ew = address_data.lng >= -114.0719 ? 'E' : 'W';
      geo = { lat: address_data.lat, lng: address_data.lng, quadrant: `${ns}${ew}`, postal_code: address_data.postal_code || null };
    } else {
      geo = await geocodeAddress(unit ? `${unit} ${address}` : address);
    }

    // Weight safety flag.
    const weight = checkWeightFlag(load_size, ai_weight_estimate_kg);
    const finalFlag = Boolean(flag_for_review) || weight.severity === 'hard';

    // Upgrade suggestion: AI thinks the load is bigger than what was selected.
    let upgrade_pending = false;
    let suggested_load_size = null;
    let suggested_price = null;
    if (ai_load_estimate && LOAD_ORDER.indexOf(ai_load_estimate) > LOAD_ORDER.indexOf(load_size)) {
      upgrade_pending = true;
      suggested_load_size = ai_load_estimate;
      suggested_price = calculatePrice({
        load_size: ai_load_estimate,
        same_day,
        stairs,
        has_freon,
        job_date,
        job_time,
      }).total;
    }

    const insert = {
      name,
      phone,
      email,
      address: unit ? `${unit}-${address}` : address,
      unit,
      postal_code: geo.postal_code || null,
      quadrant: geo.quadrant,
      lat: geo.lat,
      lng: geo.lng,
      is_apartment,
      customer_notes,
      load_size,
      base_price: priced.base_price,
      same_day,
      same_day_fee: priced.same_day_fee,
      stairs,
      stairs_fee: priced.stairs_fee,
      has_freon,
      freon_fee: priced.freon_fee,
      total_price: priced.total,
      dynamic_multiplier: priced.dynamic_multiplier,
      deposit_amount: PRICING.deposit,
      balance_due: priced.balance_due,
      job_date,
      job_time,
      job_datetime: jobDateTimeUTC(job_date, job_time).toISOString(),
      photos,
      photo_skipped,
      description_text,
      ai_load_estimate,
      ai_weight_estimate_kg,
      ai_confidence,
      has_hazmat,
      hazmat_description,
      flag_for_review: finalFlag,
      flag_reason: finalFlag ? flag_reason || (weight.flag ? weight.reason : 'Flagged') : null,
      upgrade_pending,
      suggested_load_size,
      suggested_price,
      source,
      status: 'pending_payment',
      referral_code: referral_code || null,
    };

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Booking insert failed:', error);
      return NextResponse.json({ error: 'Could not create booking.' }, { status: 500 });
    }

    // Create the $50 deposit PaymentIntent (with receipt email if provided).
    const intent = await createDepositPayment(booking.id, name, email);
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', booking.id);

    // ── Referral processing (Step 7) ──────────────────────
    // If a referral code was provided, create a pending referral record.
    // The reward is fulfilled when the booking is completed.
    if (referral_code) {
      // Normalize: referral code can be a phone number or a code
      const refPhone = referral_code.replace(/\D/g, '').length === 10
        ? `+1${referral_code.replace(/\D/g, '')}`
        : null;
      try {
        await supabaseAdmin.from('referrals').insert({
          referrer_phone: refPhone || referral_code,
          referee_phone: phone,
          booking_id: booking.id,
          status: 'pending',
        });
      } catch {
        // best-effort — don't fail the booking over a referral error
      }
    }

    return NextResponse.json({
      booking_id: booking.id,
      booking_ref: booking.booking_ref,
      client_secret: intent.client_secret,
      total: priced.total,
      balance_due: priced.balance_due,
      deposit: PRICING.deposit,
    });
  } catch (err) {
    console.error('create-booking error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
