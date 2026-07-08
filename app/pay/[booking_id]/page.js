'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// ============================================================
// /pay/[booking_id] — customer-facing payment page
// Customer opens on their own phone, pays the balance due.
// Apple Pay / Google Pay / Card via Stripe Elements, or declare Cash.
// ============================================================

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

export default function PayPage({ params }) {
  const { booking_id } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState(null); // 'digital' | 'cash'
  const [cashConfirmed, setCashConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/crew/balance-payment/${booking_id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.paid) setMethod('paid');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [booking_id]);

  const declareCash = async () => {
    const res = await fetch(`/api/crew/balance-payment/${booking_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'declare_cash' }),
    });
    if (res.ok) setCashConfirmed(true);
  };

  if (loading) {
    return (
      <div style={styles.screen}>
        <p style={styles.muted}>Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.screen}>
        <h1 style={styles.h1}>Booking not found</h1>
      </div>
    );
  }

  if (data.paid) {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={{ fontSize: 64, textAlign: 'center' }}>✅</div>
          <h1 style={{ ...styles.h1, textAlign: 'center' }}>Payment Complete</h1>
          <p style={{ ...styles.muted, textAlign: 'center' }}>
            ${data.booking.balance_due} received for {data.booking.booking_ref}
          </p>
          <p style={{ ...styles.muted, textAlign: 'center', marginTop: 16 }}>
            Receipt sent to {data.booking.email || 'your email'}.
          </p>
        </div>
      </div>
    );
  }

  const b = data.booking;

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <h1 style={styles.logo}>JUNK HAUL CALGARY</h1>
      </div>

      <div style={styles.card}>
        <p style={styles.muted}>
          Your pickup is {formatDate(b.job_date)} at {formatTime(b.job_time)}
        </p>
        <p style={styles.address}>{b.address}</p>

        <div style={styles.amountRow}>
          <span style={styles.amountLabel}>Balance due:</span>
          <span style={styles.amountValue}>${b.balance_due}.00</span>
        </div>
        <p style={styles.depositNote}>(Deposit already paid: ${b.deposit_paid})</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.h2}>How would you like to pay?</h2>

        {!method && (
          <div style={styles.methodGrid}>
            <button style={styles.methodBtn} onClick={() => setMethod('digital')}>
              <span style={{ fontSize: 32 }}>📱</span>
              <span>Apple Pay / Google Pay</span>
            </button>
            <button style={styles.methodBtn} onClick={() => setMethod('digital')}>
              <span style={{ fontSize: 32 }}>💳</span>
              <span>Credit or Debit Card</span>
            </button>
            <button style={{ ...styles.methodBtn, borderColor: '#F59E0B' }} onClick={() => setMethod('cash')}>
              <span style={{ fontSize: 32 }}>💵</span>
              <span>Pay with Cash</span>
            </button>
          </div>
        )}

        {method === 'digital' && data.clientSecret && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: data.clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#F97316' } }}
          >
            <PaymentForm bookingId={booking_id} email={b.email} />
          </Elements>
        )}

        {method === 'digital' && !stripePromise && (
          <p style={styles.error}>Stripe not configured. Please pay cash or call (587) 325-0751.</p>
        )}

        {method === 'cash' && !cashConfirmed && (
          <div>
            <div style={styles.cashNotice}>
              <strong>⚠️ IMPORTANT: The crew does not carry change.</strong>
              <p>Please have exact change ready: <strong>${b.balance_due}.00</strong></p>
              <p>${b.balance_due} exact — no more, no less.</p>
            </div>
            <button style={styles.primaryBtn} onClick={declareCash}>
              Confirm Cash Payment
            </button>
          </div>
        )}

        {cashConfirmed && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={styles.h2}>Cash Payment Selected</h2>
            <p style={styles.muted}>
              You've indicated you'll pay ${b.balance_due}.00 in cash when the crew arrives.
              The crew has been notified.
            </p>
          </div>
        )}
      </div>

      <p style={styles.footer}>junkhaul.ca · (587) 325-0751</p>
    </div>
  );
}

function PaymentForm({ bookingId, email }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: email || undefined,
        return_url: `${window.location.origin}/pay/${bookingId}`,
      },
    });
    if (result.error) {
      setErr(result.error.message);
      setBusy(false);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={styles.h2}>Payment Successful</h2>
        <p style={styles.muted}>Receipt sent to your email. The crew has been notified.</p>
      </div>
    );
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      {err && <p style={styles.error}>{err}</p>}
      <button type="submit" disabled={busy} style={styles.primaryBtn}>
        {busy ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const styles = {
  screen: { background: '#0D0D0D', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: '-apple-system, system-ui, sans-serif', maxWidth: 500, margin: '0 auto' },
  header: { textAlign: 'center', padding: '20px 0' },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#F97316' },
  card: { background: '#1A1A1A', borderRadius: 12, padding: 20, marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  h2: { fontSize: 18, fontWeight: 600, margin: '0 0 16px 0' },
  muted: { color: '#A3A3A3', fontSize: 14, margin: 0 },
  address: { color: '#fff', fontSize: 16, marginTop: 8 },
  amountRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #404040' },
  amountLabel: { color: '#A3A3A3', fontSize: 14 },
  amountValue: { fontFamily: 'Menlo, monospace', fontSize: 28, fontWeight: 700, color: '#F97316' },
  depositNote: { color: '#A3A3A3', fontSize: 12, marginTop: 4 },
  methodGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  methodBtn: { background: '#262626', border: '1px solid #404040', borderRadius: 12, padding: 20, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  primaryBtn: { background: '#F97316', color: '#0D0D0D', border: 'none', borderRadius: 12, padding: '16px 24px', fontSize: 17, fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: 16 },
  cashNotice: { background: '#262626', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, lineHeight: 1.5 },
  error: { color: '#EF4444', fontSize: 14, marginTop: 8 },
  footer: { color: '#A3A3A3', fontSize: 12, textAlign: 'center', marginTop: 24 },
};
