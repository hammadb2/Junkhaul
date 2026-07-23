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

// PaymentIntent statuses that are still payable -- i.e. safe to hand the
// same client_secret back to the customer again rather than creating a new
// intent. 'succeeded' is already paid; 'canceled' can never be confirmed
// again. Retrieving a stored intent without this check (audit B8/F7) meant
// a canceled/expired intent's client_secret got handed back forever, a
// stuck deposit/balance link the customer could never actually pay.
const REUSABLE_INTENT_STATUSES = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
]);
export const isIntentReusable = (intent) => REUSABLE_INTENT_STATUSES.has(intent?.status);

// ============================================================
// CREATE DEPOSIT PAYMENT INTENT ($50 CAD, charged immediately).
// Includes branded statement descriptor for Stripe receipts.
// ============================================================
export const createDepositPayment = async ({
  booking_id,
  customer_name,
  receipt_email,
  amount_cents = 5000,
  quote_decision_id = null,
  quote_decision_ref = null,
} = {}) => {
  return stripe.paymentIntents.create({
    amount: amount_cents,
    currency: 'cad',
    description: `Junk Haul Calgary deposit — booking ${booking_id}`,
    statement_descriptor: 'JUNK HAUL CALGARY',
    statement_descriptor_suffix: 'DEPOSIT',
    receipt_email: receipt_email || undefined,
    metadata: {
      booking_id,
      customer_name: customer_name || '',
      type: 'deposit',
      quote_decision_id: quote_decision_id || '',
      quote_decision_ref: quote_decision_ref || '',
    },
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });
};
