'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { BookButton } from '@/components/motion';

export default function WaitlistPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    preferred_day_type: 'either',
    load_size: 'quarter',
    address: '',
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) setDone(true);
    else {
      const d = await res.json();
      setError(d.error || 'Something went wrong.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-md mx-auto">
      <Link href="/">
        <Logo className="h-8 mb-6" />
      </Link>

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re on the list!</h1>
          <p className="text-gray-500">
            We&apos;ll text {form.phone} the moment a Thursday or Sunday slot opens up.
          </p>
          <Link href="/" className="text-orange-600 font-semibold mt-2">
            ← Back home
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Join the waitlist</h1>
            <p className="text-gray-500 text-sm mt-1">
              All booked up? Leave your details and we&apos;ll text you when a spot frees up.
            </p>
          </div>

          <input
            value={form.name}
            onChange={set('name')}
            placeholder="Full name"
            className="border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            value={form.phone}
            onChange={set('phone')}
            placeholder="Mobile number"
            type="tel"
            className="border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            value={form.address}
            onChange={set('address')}
            placeholder="Pickup address (optional)"
            className="border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          />

          <label className="text-sm font-medium text-gray-700">Preferred day</label>
          <select
            value={form.preferred_day_type}
            onChange={set('preferred_day_type')}
            className="border border-gray-300 rounded-xl px-3 py-3 text-sm"
          >
            <option value="either">Either Thursday or Sunday</option>
            <option value="thursday">Thursday</option>
            <option value="sunday">Sunday</option>
          </select>

          <label className="text-sm font-medium text-gray-700">Estimated load</label>
          <select
            value={form.load_size}
            onChange={set('load_size')}
            className="border border-gray-300 rounded-xl px-3 py-3 text-sm"
          >
            <option value="single_item">1–2 items</option>
            <option value="quarter">Small load</option>
            <option value="half">Half load</option>
            <option value="full">Full load</option>
          </select>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <BookButton type="submit" disabled={loading || !form.name || !form.phone}>
            {loading ? 'Adding you…' : 'Join waitlist'}
          </BookButton>
        </form>
      )}
    </main>
  );
}
