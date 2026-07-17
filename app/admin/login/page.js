'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginPage from '@/components/admin/AdminLoginPage';

export default function AdminLogin() {
  const router = useRouter();

  const handleSubmit = async ({ email, password }) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    router.push('/admin');
    router.refresh();
  };

  return <AdminLoginPage onSubmit={handleSubmit} />;
}
