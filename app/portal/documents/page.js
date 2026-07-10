'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Calculator, IdCard, Landmark, FileCheck, Car, Upload,
  CheckCircle, AlertCircle, Clock, ArrowLeft,
} from 'lucide-react';

// ============================================================
// /portal/documents — view/fill/sign/upload onboarding docs.
// Light theme per designer spec.
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

function expiryColor(expiresAt) {
  if (!expiresAt) return 'rgba(0,0,0,.4)';
  const days = Math.floor((new Date(expiresAt) - new Date()) / 86400000);
  if (days < 0) return '#EF4444';
  if (days <= 30) return '#F59E0B';
  return 'rgba(0,0,0,.4)';
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
  verified: { label: 'Verified', bg: 'rgba(34,197,94,.15)', color: '#22C55E' },
  uploaded: { label: 'Uploaded', bg: 'rgba(245,158,11,.15)', color: '#F59E0B' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,.15)', color: '#EF4444' },
  pending: { label: 'Pending', bg: 'rgba(0,0,0,.06)', color: 'rgba(0,0,0,.5)' },
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
      <div className="min-h-dvh flex items-center justify-center safe-top" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <span style={{ color: 'rgba(0,0,0,.4)' }}>Loading…</span>
      </div>
    );
  }

  const docs = data?.documents || [];
  const onboarding = data?.onboarding || { complete: false, missing: [] };

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div onClick={() => router.push('/portal/schedule')} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={17} color="#1a1a1a" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Documents</div>
        <div onClick={logout} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={17} color="#1a1a1a" style={{ transform: 'rotate(180deg)' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: '12px 14px', marginBottom: 16,
          ...(onboarding.complete
            ? { background: 'rgba(34,197,94,.10)' }
            : { background: 'rgba(245,158,11,.10)' }) }}>
          {onboarding.complete
            ? <><CheckCircle size={15} color="#22C55E" /><span style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>All onboarding documents received</span></>
            : <><Clock size={15} color="#F59E0B" /><span style={{ fontSize: 13, color: '#B45309', fontWeight: 500 }}>Missing: {onboarding.missing.map((m) => DOC_LABELS[m] || m).join(', ')}</span></>}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(239,68,68,.10)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {/* Document cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docs.map((d) => {
            const Icon = DOC_ICONS[d.doc_type] || FileText;
            const st = STATUS_STYLES[d.status] || STATUS_STYLES.pending;
            const showReason = revealedReason === d.doc_type && d.status === 'rejected' && d.notes;
            return (
              <div key={d.doc_type} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={19} color="#1a1a1a" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>
                      {DOC_LABELS[d.doc_type] || d.doc_type}
                    </div>
                    {d.expires_at && (
                      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2, color: expiryColor(d.expires_at) }}>
                        {expiryLabel(d.expires_at)}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                    {d.status === 'verified' && <CheckCircle size={11} style={{ display: 'inline', marginRight: 2 }} />}
                    {d.status === 'rejected' && <AlertCircle size={11} style={{ display: 'inline', marginRight: 2 }} />}
                    {d.status === 'pending' && <Clock size={11} style={{ display: 'inline', marginRight: 2 }} />}
                    {st.label}
                  </div>
                </div>

                {showReason && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#EF4444', lineHeight: 1.4 }}>
                    Reason: {d.notes}
                  </div>
                )}

                {d.status === 'rejected' && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a', cursor: 'pointer' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => upload(d.doc_type, e.target.files?.[0])}
                        disabled={uploading === d.doc_type}
                      />
                      <Upload size={14} color="#1a1a1a" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Reupload</span>
                    </label>
                  </div>
                )}

                {d.status !== 'rejected' && (
                  <label style={{ display: 'flex', marginTop: 10, cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => upload(d.doc_type, e.target.files?.[0])}
                      disabled={uploading === d.doc_type}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a1a', opacity: uploading === d.doc_type ? 0.5 : 1 }}>
                      {uploading === d.doc_type ? (
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Upload size={14} color="#1a1a1a" />
                      )}
                      {uploading === d.doc_type ? 'Uploading...' : 'Upload'}
                    </div>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
