'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear the admin cookie by calling the login endpoint with a bad password,
    // or better: use a dedicated logout endpoint. For now, we just redirect
    // to login — the middleware will redirect back if the cookie is still valid.
    // To actually clear: set cookie to empty via a small API call.
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
    } catch (_) {
      // ignore — some implementations may not support DELETE
    }
    router.push('/admin/login');
    router.refresh();
  };

  return <AdminLayout onLogout={handleLogout} />;
}
