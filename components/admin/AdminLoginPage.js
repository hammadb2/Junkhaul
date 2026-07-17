'use client';
// Redesigned operator login screen — replaces app/admin/login/page.js.
// Wire `submit()` back to the real /api/admin/login POST endpoint (see the
// original app/admin/login/page.js for the exact fetch call + router.push).

import { useState } from 'react';

export default function AdminLoginPage({ onSubmit }) {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !email) return;
    setLoading(true);
    setError(null);
    try {
      // Replace with the real call, e.g.:
      // const res = await fetch('/api/admin/login', { method: 'POST', headers: {...}, body: JSON.stringify({ password }) });
      // if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
      // router.push('/admin'); router.refresh();
      await onSubmit?.({ email, password });
    } catch (err) {
      setError(err.message || 'Incorrect password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>JH</div>
          <span style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>Junk Haul</span>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 8px 32px rgba(0,0,0,.06)' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Operator sign in</h1>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(0,0,0,.5)' }}>Sign in to access the dispatch console.</p>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 6 }}>Staff email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@junkhaul.ca"
              autoFocus
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,.1)', fontSize: 14, outline: 'none', marginBottom: 12 }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter password"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,.1)', fontSize: 14, outline: 'none' }}
            />
            {error && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 12.5, color: '#EF4444', fontWeight: 500 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !password || !email}
              style={{ width: '100%', marginTop: 16, padding: '12px 0', border: 'none', borderRadius: 10, background: '#f97316', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'rgba(0,0,0,.32)', fontSize: 11.5, marginTop: 20 }}>Protected operator access · Calgary, AB</p>
      </div>
    </div>
  );
}
