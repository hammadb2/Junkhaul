'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import PaymentStep from '@/components/booking/PaymentStep';
import Confirmation from '@/components/booking/Confirmation';

export default function PayPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          if (d.paid) setPaid(true);
        }
      })
      .catch(() => setError('Could not load your booking.'));
  }, [id]);

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-md mx-auto">
      <Link href="/">
        <Logo className="h-8 mb-6" />
      </Link>

      {error && <p className="text-red-600">{error}</p>}

      {!error && !data && <p className="text-gray-500">Loading…</p>}

      {data && (paid || data.paid) && (
        <Confirmation
          booking={{
            ...data.booking,
            total: data.booking.total,
            balance_due: data.booking.balance_due,
          }}
        />
      )}

      {data && !data.paid && !paid && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Pay your deposit
          </h1>
          <p className="text-gray-500 text-sm mb-5">
            Hi {data.booking.name}, a $50 deposit locks in booking{' '}
            {data.booking.booking_ref}.
          </p>
          <PaymentStep
            clientSecret={data.clientSecret}
            total={data.booking.total}
            balance_due={data.booking.balance_due}
            onPaid={() => setPaid(true)}
          />
        </div>
      )}
    </main>
  );
}
