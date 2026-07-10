'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal — employee login + signup landing.
// If there's a pending onboarding token in localStorage (from
// Add to Home Screen), redirect to onboarding automatically.
// ============================================================

export default function PortalLogin() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', sin: '', address: '' });

  useEffect(() => {
    // Check for pending onboarding token (PWA resume after Add to Home Screen)
    const onboardToken = localStorage.getItem('jh-onboard-token');
    if (onboardToken) {
      router.push(`/portal/onboard?token=${onboardToken}`);
    }
  }, [router]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const endpoint = mode === 'login' ? '/api/employee/login' : '/api/employee/signup';
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : form;
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
    router.push('/portal/schedule');
  };

  return (
    <main className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 safe-top">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-gray-900">Junk Haul Crew</div>
          <div className="text-sm text-gray-400">Employee Portal</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex gap-1 mb-4 text-sm">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg font-medium ${mode === 'login' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Log in</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg font-medium ${mode === 'signup' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Sign up</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <input value={form.name} onChange={set('name')} placeholder="Full name" required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
            )}
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email" required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
            {mode === 'signup' && (
              <input value={form.phone} onChange={set('phone')} placeholder="Phone" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
            )}
            <input value={form.password} onChange={set('password')} type="password" placeholder="Password" required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
            {mode === 'signup' && (
              <>
                <input value={form.sin} onChange={set('sin')} placeholder="SIN (optional, can add later)" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
                <input value={form.address} onChange={set('address')} placeholder="Address" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" />
                <p className="text-xs text-gray-400">Your SIN and banking info are encrypted at rest and stored only in a private Google Drive folder.</p>
              </>
            )}
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button disabled={loading} className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg disabled:bg-orange-300">
              {loading ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
