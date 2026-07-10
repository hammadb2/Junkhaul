'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/documents — view/fill/sign/upload onboarding docs.
// ============================================================

const DOC_LABELS = {
  employment_contract: 'Employment Contract',
  td1_federal: 'TD1 Federal',
  td1_ab: 'TD1AB Alberta',
  id: 'Photo ID',
  banking_info: 'Banking Info (Direct Deposit)',
  other: 'Other',
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return; }
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const upload = async (docType, file) => {
    if (!file) return;
    setUploading(docType); setError('');
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    const res = await fetch('/api/employee/documents', { method: 'POST', body: fd });
    const d = await res.json();
    setUploading(null);
    if (!res.ok) { setError(d.error || 'Upload failed'); return; }
    load();
  };

  const logout = async () => { await fetch('/api/employee/logout', { method: 'POST' }); router.push('/portal'); };

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-gray-400">Loading…</div>;

  const docs = data?.documents || [];
  const onboarding = data?.onboarding || { complete: false, missing: [] };

  return (
    <main className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0">
        <button onClick={() => router.push('/portal/schedule')} className="text-gray-500 text-sm">‹ Today</button>
        <span className="font-bold text-gray-900">Documents</span>
        <button onClick={logout} className="text-gray-400 text-sm underline">Out</button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        <div className={`rounded-xl p-3 text-sm ${onboarding.complete ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {onboarding.complete
            ? '✓ All onboarding documents received. You\'re onboarded.'
            : `Remaining: ${onboarding.missing.map((m) => DOC_LABELS[m] || m).join(', ')}`}
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        {docs.map((d) => (
          <div key={d.doc_type} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900 text-sm">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'verified' ? 'bg-green-100 text-green-700' : d.status === 'uploaded' ? 'bg-blue-100 text-blue-700' : d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                {d.status}
              </span>
            </div>
            {d.status === 'rejected' && d.notes && (
              <div className="text-xs text-red-500 mt-1">{d.notes}</div>
            )}
            <label className="mt-2 block">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => upload(d.doc_type, e.target.files?.[0])}
                disabled={uploading === d.doc_type}
              />
              <span className={`inline-block text-xs px-3 py-1.5 rounded-lg ${d.status === 'uploaded' || d.status === 'verified' ? 'bg-gray-100 text-gray-600' : 'bg-gray-900 text-white'} ${uploading === d.doc_type ? 'opacity-50' : ''}`}>
                {uploading === d.doc_type ? 'Uploading…' : d.status === 'uploaded' || d.status === 'verified' ? 'Re-upload' : 'Upload'}
              </span>
            </label>
          </div>
        ))}
      </div>
    </main>
  );
}
