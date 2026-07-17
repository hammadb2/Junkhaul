'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const REQUIRED_PHOTOS = [
  ['full_item_view', 'Full item view'],
  ['condition_close_up', 'Condition close-up'],
  ['damage_photo', 'Damage or “no damage” photo'],
  ['total_quantity_context', 'Total quantity/context photo'],
];

export default function DonationBookingPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const existing = localStorage.getItem('jh_session');
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem('jh_session', id);
    return id;
  });
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    unit: '',
    buzzer: '',
    access_instructions: '',
    availability: '',
    outside_pickup_permission: false,
    stairs: 0,
    elevator: false,
    parking: '',
    description: '',
    confirmation_photos_accurate: false,
    confirmation_items_clean: false,
    confirmation_items_usable: false,
    confirmation_no_garbage: false,
    confirmation_no_hazmat: false,
  });
  const [photos, setPhotos] = useState({});
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const missing = REQUIRED_PHOTOS.filter(([type]) => !photos[type]);
    if (missing.length) {
      setError(`Missing photos: ${missing.map(([, label]) => label).join(', ')}`);
      setLoading(false);
      return;
    }
    const photoPayload = REQUIRED_PHOTOS.map(([type]) => ({
      photo_type: type,
      storage_url: photos[type],
      source_step: 'donation_form',
    }));
    const res = await fetch('/api/donation-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        session_id: sessionId,
        availability: { note: form.availability },
        photos: photoPayload,
        confirmations: {
          confirmation_photos_accurate: form.confirmation_photos_accurate,
          confirmation_items_clean: form.confirmation_items_clean,
          confirmation_items_usable: form.confirmation_items_usable,
          confirmation_no_garbage: form.confirmation_no_garbage,
          confirmation_no_hazmat: form.confirmation_no_hazmat,
        },
        attribution: {
          landing_path: window.location.pathname,
          referrer: document.referrer || null,
          tracking_code: new URLSearchParams(window.location.search).get('code') || null,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
        },
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Could not submit donation request.');
      return;
    }
    setResult(data);
  };

  if (result) {
    return (
      <main className="min-h-dvh px-6 py-6 max-w-xl mx-auto">
        <Logo className="h-9 mb-8" />
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900">Donation request received</h1>
          <p className="text-gray-600 mt-3">
            Reference {result.request_ref}. This is not a confirmed pickup. Admin will review item quality and route fit before any pickup window is offered.
          </p>
          <Link href="/" className="text-orange-600 font-semibold inline-block mt-5">Back home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-6 py-6 max-w-xl mx-auto">
      <Link href="/"><Logo className="h-9 mb-6" /></Link>
      <h1 className="text-3xl font-bold text-gray-900">Free donation-only pickup request</h1>
      <p className="text-gray-600 mt-3">
        Free pickup is only for approved donation-quality items when your location and availability fit naturally into an existing paid route. Submission does not confirm pickup.
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-900 mt-5">
        Photos are mandatory. Items must be clean, usable, and not mixed with garbage or hazardous material. Rejected items may receive a paid junk-removal quote.
      </div>

      <form onSubmit={submit} className="space-y-4 mt-6">
        {['name','phone','email','address','unit','buzzer','parking'].map((key) => (
          <input key={key} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={key.replace(/_/g, ' ')} className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm" />
        ))}
        <textarea value={form.access_instructions} onChange={(e) => set('access_instructions', e.target.value)} placeholder="Access instructions" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm" />
        <textarea value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="Availability windows" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm" />
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the donation items, condition, quantity, and any damage" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm" rows={4} />

        <div className="grid gap-3">
          {REQUIRED_PHOTOS.map(([type, label]) => (
            <label key={type} className="block text-sm">
              <span className="font-medium text-gray-700">{label}</span>
              <input value={photos[type] || ''} onChange={(e) => setPhotos((p) => ({ ...p, [type]: e.target.value }))} placeholder="Temporary photo URL" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm mt-1" />
            </label>
          ))}
        </div>

        {[
          ['outside_pickup_permission', 'Outside pickup is allowed if approved'],
          ['confirmation_photos_accurate', 'Photos accurately show the items'],
          ['confirmation_items_clean', 'Items are clean'],
          ['confirmation_items_usable', 'Items are usable'],
          ['confirmation_no_garbage', 'No garbage is included'],
          ['confirmation_no_hazmat', 'No hazardous material is included'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => set(key, e.target.checked)} />
            {label}
          </label>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading || !form.phone || !form.address} className="w-full bg-orange-500 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit donation request'}
        </button>
      </form>
    </main>
  );
}
