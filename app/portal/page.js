'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, MapPin, FileText, AlertCircle } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

// ============================================================
// /portal — employee login + signup landing. Light theme.
// ============================================================

export default function PortalLogin() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', sin: '', address: '' });

  useEffect(() => {
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
    if (data.employee && data.employee.pending_verification) {
      router.push('/portal/verification');
    } else if (data.employee && !data.employee.onboarding_complete) {
      router.push('/portal/onboard');
    } else {
      router.push('/portal/schedule');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div className="w-full max-w-md flex-1 flex flex-col overflow-y-auto" style={{ padding: '64px 28px 24px' }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
            <AlertCircle size={16} color="#EF4444" />
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          <img src="/crew-logo.png" alt="JunkHaul" style={{ width: 104, height: 104, objectFit: 'contain' }} />
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', color: 'rgba(0,0,0,.5)', textTransform: 'uppercase' }}>Employee Portal</div>
        </div>

        <div style={{ display: 'flex', background: '#F0F0F2', borderRadius: 999, padding: 4, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'all .15s',
              ...(mode === 'login' ? { background: '#f97316', color: '#fff' } : { background: 'transparent', color: 'rgba(0,0,0,.5)' }) }}
          >Log In</button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{ flex: 1, textAlign: 'center', padding: '11px 0', borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'all .15s',
              ...(mode === 'signup' ? { background: '#f97316', color: '#fff' } : { background: 'transparent', color: 'rgba(0,0,0,.5)' }) }}
          >Sign Up</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <InputField icon={User} label="Full name" value={form.name} onChange={set('name')} required />
          )}
          <InputField icon={Mail} label="Email" type="email" value={form.email} onChange={set('email')} required />
          {mode === 'signup' && (
            <InputField icon={Phone} label="Phone number" value={form.phone} onChange={set('phone')} />
          )}
          <InputField icon={Lock} label="Password" type="password" value={form.password} onChange={set('password')} required />
          {mode === 'signup' && (
            <>
              <InputField icon={FileText} label="SIN (optional)" value={form.sin} onChange={set('sin')} />
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                placeholder="Home address"
                dark={false}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                <Lock size={12} color="rgba(0,0,0,.4)" />
                <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)' }}>SIN and banking info are encrypted</span>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: 52, borderRadius: 14, background: '#f97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'default' : 'pointer',
              border: 'none', boxShadow: '0 8px 20px rgba(249,115,22,.28)',
              opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
              marginTop: 4,
            }}
          >
            {loading ? '…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function InputField({ icon: Icon, label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '0 16px', height: 52 }}>
      <Icon size={18} color="rgba(0,0,0,.4)" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={label}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 15, color: '#1a1a1a', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}
