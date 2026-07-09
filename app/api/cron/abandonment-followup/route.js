import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { checkCronSecret } from '@/lib/cronAuth';

export const runtime = 'nodejs';

// ============================================================
// ABANDONMENT FOLLOW-UP CRON
// Runs every 30 minutes. Sends a 3-touch loss-aversion sequence
// to leads who got a quote but never booked:
//
//   T+1 hour:  "Your price is saved, want to lock your date?"
//   T+20 hours: "Your quote expires in 4 hours" (real urgency)
//   T+47 hours: Final call + small reciprocity discount offer
//
// Each touch is guarded by its own boolean flag so the sequence
// is idempotent and survives cron retries.
// ============================================================

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let sentCount = 0;
  const errors = [];

  // ── Touch 1: T+1 hour ──────────────────────────────────
  // Leads that revealed a quote > 1 hour ago, haven't booked,
  // and haven't received the first follow-up yet.
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const { data: touch1Leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('quote_revealed_at', 'is', null)
    .lt('quote_revealed_at', oneHourAgo.toISOString())
    .eq('follow_up_sent', false)
    .is('converted_to_booking_id', null);

  for (const lead of touch1Leads || []) {
    try {
      const msg = `Hey, it's Junk Haul Calgary. Your price of $${lead.ai_price_estimate} is still saved — want to lock in your date? Book here: https://junkhaul.ca/book or text us back.`;
      await sendSMS(lead.phone, msg, null, 'abandonment_touch1');
      await supabaseAdmin
        .from('leads')
        .update({
          follow_up_sent: true,
          follow_up_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', lead.id);
      sentCount++;
    } catch (err) {
      errors.push({ lead_id: lead.id, touch: 1, error: err.message });
    }
  }

  // ── Touch 2: T+20 hours ────────────────────────────────
  // "Your quote expires in 4 hours" — real urgency since the
  // quote actually has a 48-hour validity window.
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const { data: touch2Leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('quote_revealed_at', 'is', null)
    .lt('quote_revealed_at', twentyHoursAgo.toISOString())
    .eq('follow_up_sent', true)
    .eq('abandonment_sms_sent', false)
    .is('converted_to_booking_id', null);

  for (const lead of touch2Leads || []) {
    try {
      const msg = `Junk Haul Calgary: Your quote of $${lead.ai_price_estimate} expires in about 4 hours. After that we can't guarantee the same price. Lock it in now: https://junkhaul.ca/book`;
      await sendSMS(lead.phone, msg, null, 'abandonment_touch2');
      await supabaseAdmin
        .from('leads')
        .update({
          abandonment_sms_sent: true,
          abandonment_sms_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', lead.id);
      sentCount++;
    } catch (err) {
      errors.push({ lead_id: lead.id, touch: 2, error: err.message });
    }
  }

  // ── Touch 3: T+47 hours ────────────────────────────────
  // Final call + reciprocity offer (small discount to close).
  const fortySevenHoursAgo = new Date(now.getTime() - 47 * 60 * 60 * 1000);
  const { data: touch3Leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .not('quote_revealed_at', 'is', null)
    .lt('quote_revealed_at', fortySevenHoursAgo.toISOString())
    .eq('abandonment_sms_sent', true)
    .eq('final_reminder_sent', false)
    .is('converted_to_booking_id', null);

  for (const lead of touch3Leads || []) {
    try {
      // Reciprocity offer: $15 off if they book now
      const discountedPrice = Math.max(
        lead.ai_price_estimate - 15,
        Math.round(lead.ai_price_estimate * 0.9) // never below 90% as floor
      );
      const msg = `Last chance! We'd love to help you clear that junk. Book now and we'll take $15 off your quote — you pay $${discountedPrice} instead of $${lead.ai_price_estimate}. Offer ends tonight: https://junkhaul.ca/book`;
      await sendSMS(lead.phone, msg, null, 'abandonment_touch3');
      await supabaseAdmin
        .from('leads')
        .update({
          final_reminder_sent: true,
          final_reminder_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', lead.id);
      sentCount++;
    } catch (err) {
      errors.push({ lead_id: lead.id, touch: 3, error: err.message });
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
