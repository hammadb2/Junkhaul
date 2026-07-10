'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('loading'); // loading | valid | expired | error
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/employee/reset-password?token=${token}`);
        const d = await res.json();
        if (res.ok) { setStatus('valid'); setEmail(d.email || ''); }
        else if (res.status === 410) setStatus('expired');
        else setStatus('error');
      } catch { setStatus('error'); }
    })();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number'); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError('Password must contain at least one special character'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (res.ok) { setDone(true); }
      else { setError(d.error || 'Reset failed'); }
    } catch { setError('Reset failed'); }
    setSubmitting(false);
  };

  const pageStyle = { minHeight: '100dvh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' };
  const cardStyle = { background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.06)', padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,.06)' };
  const inputStyle = { width: '100%', height: 52, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '0 16px', fontSize: 16, color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' };
  const btnStyle = { width: '100%', height: 52, background: '#f97316', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(249,115,22,.28)' };

  if (done) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(34,197,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#22C55E" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', margin: '0 0 8px' }}>Password set!</h1>
          <p style={{ fontSize: 15, color: 'rgba(0,0,0,.6)', textAlign: 'center', margin: '0 0 24px' }}>
            Your password has been updated. You can now log in with your new password.
          </p>
          <button onClick={() => router.push('/portal')} style={btnStyle}>Go to login</button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (status === 'expired' || status === 'error') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} color="#EF4444" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', margin: '0 0 8px' }}>
            {status === 'expired' ? 'Link expired' : 'Invalid link'}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(0,0,0,.6)', textAlign: 'center', margin: '0 0 24px' }}>
            {status === 'expired' ? 'This password reset link has expired. Ask your manager to send a new one.' : 'This reset link is not valid. Check your email for the correct link.'}
          </p>
          <button onClick={() => router.push('/portal')} style={{ ...btnStyle, background: '#F5F5F7', color: '#1a1a1a', boxShadow: 'none', border: '1px solid rgba(0,0,0,.10)' }}>Back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <button onClick={() => router.push('/portal')} style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F5F7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 20 }}>
          <ArrowLeft size={18} color="#1a1a1a" />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 6px' }}>Set your password</h1>
        <p style={{ fontSize: 15, color: 'rgba(0,0,0,.6)', margin: '0 0 24px' }}>
          {email ? `For ${email}` : 'Enter a new password for your account'}
        </p>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>New password</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 chars, 1 number, 1 special"
              style={inputStyle}
              autoFocus
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              {showPw ? <EyeOff size={18} color="rgba(0,0,0,.4)" /> : <Eye size={18} color="rgba(0,0,0,.4)" />}
            </button>
          </div>
          {error && <p style={{ fontSize: 14, color: '#EF4444', margin: '0 0 12px' }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Setting password...' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
