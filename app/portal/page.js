'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, MapPin, FileText, AlertCircle } from 'lucide-react';

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
    // If onboarding is not complete, redirect to onboarding
    if (data.employee && !data.employee.onboarding_complete) {
      router.push('/portal/onboard');
    } else {
      router.push('/portal/schedule');
    }
  };

  return (
    <main className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#0A0A0B' }}>
      {/* Logo centered ~1/3 down */}
      <div className="flex flex-col items-center justify-center" style={{ paddingTop: '33vh' }}>
        <img src="/crew-logo.png" alt="Junk Haul" className="w-24 h-24 rounded-2xl object-cover" />
        <div className="mt-4 text-center">
          <div className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.90)' }}>Junk Haul</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>Employee Portal</div>
        </div>
      </div>

      {/* Error banner slides down */}
      {error && (
        <div className="slide-up mx-6 mt-6 rounded-xl p-3 flex items-start gap-2"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
          <span className="text-sm" style={{ color: '#FCA5A5' }}>{error}</span>
        </div>
      )}

      {/* Form area */}
      <div className="flex-1 flex flex-col px-6 mt-8">
        {/* Pill tabs */}
        <div className="flex gap-2 p-1 rounded-full mb-6"
          style={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
            style={mode === 'login'
              ? { background: '#f97316', color: 'white' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.60)' }}
          >Log In</button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
            style={mode === 'signup'
              ? { background: '#f97316', color: 'white' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.60)' }}
          >Sign Up</button>
        </div>

        <form onSubmit={submit} className="space-y-3 flex-1">
          {mode === 'signup' && (
            <FloatingField icon={User} label="Full name" value={form.name} onChange={set('name')} required />
          )}
          <FloatingField icon={Mail} label="Email" type="email" value={form.email} onChange={set('email')} required />
          {mode === 'signup' && (
            <FloatingField icon={Phone} label="Phone" value={form.phone} onChange={set('phone')} />
          )}
          <FloatingField icon={Lock} label="Password" type="password" value={form.password} onChange={set('password')} required />
          {mode === 'signup' && (
            <>
              <FloatingField icon={FileText} label="SIN (optional, can add later)" value={form.sin} onChange={set('sin')} />
              <FloatingField icon={MapPin} label="Address" value={form.address} onChange={set('address')} />
              <p className="text-xs px-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
                Your SIN and banking info are encrypted at rest and stored only in a private Google Drive folder.
              </p>
            </>
          )}
        </form>
      </div>

      {/* Primary action pinned above safe-area bottom */}
      <div className="px-6 pb-6 safe-bottom">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ minHeight: 56, fontSize: 16 }}
        >
          {loading ? '…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </div>
    </main>
  );
}

// Floating-label input field (Material-style) with leading icon
function FloatingField({ icon: Icon, label, value, onChange, type = 'text', required }) {
  const [focused, setFocused] = useState(false);
  const active = focused || (value && value.length > 0);
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
        style={{ color: active ? '#f97316' : 'rgba(255,255,255,0.40)' }}>
        <Icon size={18} />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={active ? '' : label}
        className="dark-input w-full"
        style={{
          minHeight: 56,
          paddingLeft: 44,
          paddingRight: 16,
          paddingTop: active ? 20 : 16,
          paddingBottom: active ? 8 : 16,
          fontSize: 16,
        }}
      />
      {active && (
        <span className="absolute left-11 top-2 text-xs transition-all"
          style={{ color: '#f97316' }}>
          {label}
        </span>
      )}
    </div>
  );
}
