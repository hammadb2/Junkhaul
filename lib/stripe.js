import Stripe from 'stripe';

// Lazily initialised so importing this module never requires the secret key
// (keeps `next build` working without env vars). Constructed on first access.
let _stripe = null;
function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
  _stripe = new Stripe(key);
  return _stripe;
}

export const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getStripe();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

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
