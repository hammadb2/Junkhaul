'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Calculator, IdCard, Landmark, FileCheck, Car, Upload,
  CheckCircle, AlertCircle, Clock, ArrowLeft,
} from 'lucide-react';

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

const DOC_ICONS = {
  employment_contract: FileText,
  td1_federal: Calculator,
  td1_ab: Calculator,
  id: IdCard,
  banking_info: Landmark,
  sin: FileCheck,
  license: Car,
  other: FileText,
};

// Document expiry helpers
function expiryColor(expiresAt) {
  if (!expiresAt) return 'rgba(255,255,255,0.4)';
  const days = Math.floor((new Date(expiresAt) - new Date()) / 86400000);
  if (days < 0) return '#EF4444';
  if (days <= 30) return '#F59E0B';
  return 'rgba(255,255,255,0.4)';
}
function expiryLabel(expiresAt) {
  if (!expiresAt) return '';
  const days = Math.floor((new Date(expiresAt) - new Date()) / 86400000);
  if (days < 0) return `Expired ${Math.abs(days)}d ago — renew now`;
  if (days === 0) return 'Expires today — renew now';
  if (days <= 30) return `Expires in ${days}d`;
  return `Valid until ${new Date(expiresAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const STATUS_STYLES = {
  verified: { label: 'Verified', bg: 'rgba(34,197,94,0.16)', color: '#22C55E', filled: true },
  uploaded: { label: 'Uploaded', bg: 'transparent', color: '#F59E0B', filled: false },
  rejected: { label: 'Rejected', bg: 'transparent', color: '#EF4444', filled: false },
  pending: { label: 'Pending', bg: 'transparent', color: '#6B7280', filled: false },
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);
  const [revealedReason, setRevealedReason] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return; }
    const d = await res.json();
    setData(d);
    setLoading(false);
    if (d.employee && !d.employee.onboarded) {
      router.push('/portal/onboard');
    }
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

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center safe-top" style={{ background: '#0A0A0B' }}>
        <span style={{ color: 'rgba(255,255,255,0.40)' }}>Loading…</span>
      </main>
    );
  }

  const docs = data?.documents || [];
  const onboarding = data?.onboarding || { complete: false, missing: [] };

  return (
    <main className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#0A0A0B' }}>
      {/* Floating glass header bar */}
      <header className="glass-bar sticky top-0 z-20 mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.push('/portal/schedule')} aria-label="Back"
          className="glass-btn flex items-center justify-center rounded-full"
          style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.60)' }}>
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.90)' }}>Documents</span>
        <button onClick={logout} aria-label="Logout"
          className="glass-btn flex items-center justify-center rounded-full"
          style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.60)' }}>
          <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </header>

      <div className="flex-1 px-6 pt-4 pb-6 max-w-md w-full mx-auto space-y-3">
        {/* Slim status strip */}
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm"
          style={onboarding.complete
            ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
            : { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
          {onboarding.complete
            ? <><CheckCircle size={16} /><span>All onboarding documents received. You&apos;re onboarded.</span></>
            : <><AlertCircle size={16} /><span>Remaining: {onboarding.missing.map((m) => DOC_LABELS[m] || m).join(', ')}</span></>}
        </div>

        {error && (
          <div className="rounded-xl px-4 py-2.5 flex items-start gap-2 text-sm"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {docs.map((d) => {
          const Icon = DOC_ICONS[d.doc_type] || FileText;
          const st = STATUS_STYLES[d.status] || STATUS_STYLES.pending;
          const showReason = revealedReason === d.doc_type && d.status === 'rejected' && d.notes;
          return (
            <div key={d.doc_type} className="dark-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 44, height: 44, background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)' }}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'rgba(255,255,255,0.90)' }}>
                    {DOC_LABELS[d.doc_type] || d.doc_type}
                  </div>
                  <button
                    onClick={() => d.status === 'rejected' && setRevealedReason(showReason ? null : d.doc_type)}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background: st.filled ? st.bg : 'transparent',
                      border: `1px solid ${st.color}`,
                      color: st.color,
                    }}
                  >
                    {d.status === 'verified' && <CheckCircle size={11} />}
                    {d.status === 'rejected' && <AlertCircle size={11} />}
                    {d.status === 'pending' && <Clock size={11} />}
                    {st.label}
                  </button>
                </div>
                {/* Upload icon button */}
                <label className="flex-shrink-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => upload(d.doc_type, e.target.files?.[0])}
                    disabled={uploading === d.doc_type}
                  />
                  <span
                    className="glass-btn flex items-center justify-center rounded-full"
                    style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.60)', opacity: uploading === d.doc_type ? 0.5 : 1 }}
                  >
                    {uploading === d.doc_type ? (
                      <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                  </span>
                </label>
              </div>
              {showReason && (
                <div className="mt-2 text-xs slide-up" style={{ color: '#FCA5A5' }}>
                  Reason: {d.notes}
                </div>
              )}
              {d.expires_at && (
                <div className="mt-2 text-xs flex items-center gap-1" style={{ color: expiryColor(d.expires_at) }}>
                  <Clock size={11} />
                  {expiryLabel(d.expires_at)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
