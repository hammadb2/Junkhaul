'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { BookButton } from '@/components/motion';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
      <Logo className="h-9 mb-8" />
      <form onSubmit={submit} className="w-full space-y-4">
        <h1 className="text-xl font-bold text-gray-900 text-center">Operator login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <BookButton type="submit" disabled={loading || !password}>
          {loading ? 'Signing in…' : 'Sign in'}
        </BookButton>
      </form>
    </main>
  );
}
