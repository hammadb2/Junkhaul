'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { BookButton } from '@/components/motion';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

function BreakdownLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between mt-1">
      <span className="text-gray-500">{label}</span>
      <span>${value}</span>
    </div>
  );
}

function InnerForm({ total, balance_due, breakdown, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  // Derived from the two real numbers the server already computed (audit
  // B7), instead of a hardcoded "$50" that could silently disagree with
  // whatever was actually charged if the live deposit config ever changes.
  const deposit = total - balance_due;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaid();
    } else {
      setError('Payment could not be completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl bg-gray-50 p-4 text-sm">
        {breakdown && (
          <>
            <BreakdownLine label="Base price" value={breakdown.base_price} />
            <BreakdownLine label="Same-day" value={breakdown.same_day_fee} />
            <BreakdownLine label="Stairs" value={breakdown.stairs_fee} />
            <BreakdownLine label="Freon appliances" value={breakdown.freon_fee} />
            <BreakdownLine label="Travel" value={breakdown.travel_fee} />
            <div className="border-t border-gray-200 my-2" />
          </>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Total job price</span>
          <span className="font-semibold">${total}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-500">Deposit due now</span>
          <span className="font-semibold text-orange-600">${deposit}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-500">Balance on pickup day</span>
          <span className="font-semibold">${balance_due}</span>
        </div>
      </div>

      <PaymentElement />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <BookButton type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing…' : `Pay $${deposit} deposit & confirm`}
      </BookButton>
      <p className="text-center text-xs text-gray-400">
        🔒 Secure payment via Stripe. 24-hour free cancellation.
      </p>
    </form>
  );
}

export default function PaymentStep({ clientSecret, total, balance_due, breakdown, onPaid }) {
  if (!clientSecret) return null;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'flat', variables: { colorPrimary: '#f97316' } },
      }}
    >
      <InnerForm total={total} balance_due={balance_due} breakdown={breakdown} onPaid={onPaid} />
    </Elements>
  );
}
