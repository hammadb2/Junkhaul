import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { handleBookingConfirmed } from '@/lib/bookingActions';
import { confirmQuoteDecisionBooking } from '@/lib/quoteDecision';

export const runtime = 'nodejs';

// Stripe requires the raw body to verify the signature.
export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const booking_id = intent.metadata?.booking_id;
        if (!booking_id) break;

        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('id', booking_id)
          .single();

        if (!booking || booking.deposit_paid) break; // idempotent

        await supabaseAdmin
          .from('bookings')
          .update({
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            stripe_charge_id: intent.latest_charge,
            status: 'confirmed',
          })
          .eq('id', booking_id);

        // Confirm the quote decision once payment has succeeded.
        if (booking.quote_decision_id) {
          try {
            await confirmQuoteDecisionBooking({ decisionId: booking.quote_decision_id, bookingId: booking_id });
          } catch (err) {
            console.error('Quote decision confirmation failed:', err.message);
          }
        }

        // Reserve the slot.
        await supabaseAdmin.rpc('increment_slot', {
          p_date: booking.job_date,
          p_time: booking.job_time,
        });

        // Fire confirmation + operator alerts + flags.
        await handleBookingConfirmed(booking_id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const booking_id = intent.metadata?.booking_id;
        if (booking_id) {
          console.warn(`Deposit failed for booking ${booking_id}`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 200 so Stripe doesn't hammer retries for our internal errors,
    // but log loudly. Signature failures already returned 400 above.
    return NextResponse.json({ received: true, handlerError: true });
  }

  return NextResponse.json({ received: true });
}
