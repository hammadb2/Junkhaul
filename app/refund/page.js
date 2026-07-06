'use client';
import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function RefundPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', booking_ref: '', reason: '', amount: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.name || !form.phone || !form.reason) return;
    setLoading(true);
    await fetch('/api/refund-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        <Logo className="h-12 mb-6" />
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Request Received</h1>
          <p className="text-gray-600">
            We&apos;ve received your refund request and our team will review it within 24 hours.
            You&apos;ll get a text and email with the outcome.
          </p>
          <p className="text-sm text-gray-400">Reference: {form.booking_ref || 'New request'}</p>
          <Link href="/" className="inline-block mt-4 text-orange-600 font-medium">
            Back to home →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 py-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/"><Logo className="h-7" showWordmark={false} /></Link>
        <Link href="/" className="text-sm text-gray-400">← Home</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Request a Refund</h1>
      <p className="text-sm text-gray-500 mb-6">
        Fill out the form below and our Resolution team will review your request within 24 hours.
      </p>

      <div className="space-y-4">
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Full name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Phone number *"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Email (optional)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Booking reference (e.g. JH-ABCD12)"
          value={form.booking_ref}
          onChange={(e) => setForm({ ...form, booking_ref: e.target.value })}
        />
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Refund amount requested (optional)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <textarea
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none resize-none"
          placeholder="Tell us what happened and why you&apos;re requesting a refund *"
          rows={5}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />

        <button
          onClick={submit}
          disabled={loading || !form.name || !form.phone || !form.reason}
          className="w-full bg-orange-500 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Refund Request'}
        </button>
        <p className="text-center text-xs text-gray-400">
          Our team reviews every request within 24 hours.
        </p>
      </div>
    </main>
  );
}
