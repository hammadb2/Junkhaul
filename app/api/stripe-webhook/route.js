import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { handleBookingConfirmed } from '@/lib/bookingActions';
import { confirmQuoteDecisionBooking } from '@/lib/quoteDecision';
import { createAlert } from '@/lib/alerts';
import { getTenantBySlug } from '@/lib/rehaul';
import { isPaidStatus } from '@/lib/paymentStatus';

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
        const paymentType = intent.metadata?.type || 'deposit';

        // Balance payment reconciliation (audit finding F1). The customer
        // paid their remaining balance online via /pay/[booking_id]. The
        // deposit branch below early-returns for already-deposited bookings,
        // so without this a successful balance charge was never recorded —
        // the customer was shown "Payment Successful" while the booking still
        // read unpaid, revenue dashboards missed it, and the crew could ask
        // for payment again.
        if (paymentType === 'balance') {
          const { data: balBooking } = await supabaseAdmin
            .from('bookings')
            .select('id, payment_status')
            .eq('id', booking_id)
            .maybeSingle();
          if (!balBooking) break;
          if (isPaidStatus(balBooking.payment_status)) break; // idempotent / already collected
          // 'paid_card' is the constraint-valid status for an online card
          // payment (there is no plain 'paid' value — see lib/paymentStatus).
          // Zero the balance so the customer's tracker and the /pay page both
          // read as settled and revenue-owed reports stop counting it.
          const { error: balErr } = await supabaseAdmin
            .from('bookings')
            .update({
              payment_status: 'paid_card',
              payment_collected_at: new Date().toISOString(),
              balance_due: 0,
            })
            .eq('id', booking_id);
          if (balErr) {
            console.error(`Balance reconciliation failed for booking ${booking_id}:`, balErr.message);
          }
          break;
        }

        // Crew tips are recorded directly by app/api/track/[token]/tip when
        // the customer confirms them; nothing to reconcile here.
        if (paymentType === 'tip') break;

        // Deposit (default, and legacy intents created without a type).
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

        // Reserve the slot. increment_slot() only applies if capacity
        // remains and reports whether it actually reserved one — a paid
        // booking can still race another paid booking for the last slot,
        // so this must be detected rather than silently oversold.
        const { data: reserved } = await supabaseAdmin.rpc('increment_slot', {
          p_date: booking.job_date,
          p_time: booking.job_time,
        });

        if (reserved === false) {
          console.error(`Slot oversold: booking ${booking_id} paid but ${booking.job_date} ${booking.job_time} was already full.`);
          try {
            const tenant = await getTenantBySlug('junkhaul');
            await createAlert({
              tenantId: tenant.id,
              category: 'capacity_oversold',
              severity: 'critical',
              title: 'Slot oversold after payment',
              description: `Booking ${booking.booking_ref || booking_id} paid successfully for ${booking.job_date} ${booking.job_time}, but that slot was already at capacity. Needs manual reschedule or capacity review — do not cancel automatically.`,
              entityType: 'booking',
              entityId: booking_id,
            });
          } catch (alertErr) {
            console.error('Failed to create capacity_oversold alert:', alertErr.message);
          }
        }

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
