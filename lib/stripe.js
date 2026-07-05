import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================================
// CREATE DEPOSIT PAYMENT INTENT ($50 CAD, charged immediately).
// ============================================================
export const createDepositPayment = async (booking_id, customer_name) => {
  return stripe.paymentIntents.create({
    amount: 5000, // $50.00 in cents
    currency: 'cad',
    description: `Junk Haul Calgary deposit — booking ${booking_id}`,
    metadata: {
      booking_id,
      customer_name: customer_name || '',
      type: 'deposit',
    },
    automatic_payment_methods: { enabled: true },
  });
};
