'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDateLong } from '@/lib/dates';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { X, Check, Circle, UserPlus, Radio, Truck, Warehouse, Heart, ChevronRight, Mail, Phone, Clock, FileText, AlertTriangle, Send } from 'lucide-react';

// ── Light theme tokens (Tailwind classes) ──
const CARD = 'bg-white border border-black/[0.06] rounded-2xl';
const INPUT = 'bg-[#F0F0F2] border border-black/[0.06] rounded-lg text-[#1a1a1a] placeholder-black/30';
const TXT = 'text-[#1a1a1a]';
const TXT2 = 'text-black/60';
const TXT3 = 'text-black/40';
const ORANGE = 'text-[#f97316]';
const GREEN = 'text-[#22C55E]';
const RED = 'text-[#EF4444]';
const AMBER = 'text-[#F59E0B]';

const STATUS_STYLES = {
  active: 'bg-[#22C55E]/15 text-[#22C55E]',
  onboarded: 'bg-[#22C55E]/15 text-[#22C55E]',
  pending: 'bg-[#F59E0B]/15 text-[#F59E0B]',
  pending_verification: 'bg-[#3B82F6]/15 text-[#3B82F6]',
  rejected: 'bg-[#EF4444]/15 text-[#EF4444]',
  terminated: 'bg-[#EF4444]/15 text-[#EF4444]',
};

function statusLabel(status) {
  if (status === 'onboarded') return 'Active';
  if (status === 'pending_verification') return 'Pending Verification';
  return (status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1);
}

function fmtMins(mins) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', year: 'numeric' });
}

function todayStr() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// ── Ring indicator for stat cards ──
function Ring({ value, max, size = 48, stroke = 4, color = '#f97316' }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ - pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

export default function CrewView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [message, setMessage] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [crewRes, assignRes, facRes, cenRes] = await Promise.all([
        fetch('/api/admin/crew'),
        fetch('/api/admin/crew/assignments'),
        fetch('/api/admin/crew/storage'),
        fetch('/api/admin/crew/donation-centers'),
      ]);
      const crew = await crewRes.json();
      const assign = await assignRes.json();
      const fac = await facRes.json();
      const cen = await cenRes.json();
      setData(crew);
      setAssignments(assign.assignments || []);
      setFacilities(fac.facilities || []);
      setCenters(cen.centers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const employees = useMemo(() => data?.employees || [], [data]);
  const invites = data?.pending_invites || [];
  const summary = data?.summary;
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active' || e.status === 'onboarded'),
    [employees]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a1a1a]">Crew Management</h2>
        {message && (
          <span className={`text-sm font-medium ${message.type === 'error' ? RED : GREEN}`}>
            {message.text}
          </span>
        )}
      </div>

      {/* Stat cards with ring indicators */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total" value={summary.total} icon={<Circle size={16} className="text-black/40" />} />
          <StatCard label="Active" value={summary.onboarded} icon={<Check size={16} className="text-[#22C55E]" />} ringValue={summary.onboarded} ringMax={summary.total} ringColor="#22C55E" />
          <StatCard label="Pending" value={summary.pending} icon={<AlertTriangle size={16} className="text-[#F59E0B]" />} accent={summary.pending > 0} />
          <StatCard label="Verify" value={summary.pending_verification || 0} icon={<Check size={16} className="text-[#3B82F6]" />} accent={(summary.pending_verification || 0) > 0} />
          <StatCard label="Clocked In" value={summary.clocked_in_now} icon={<Clock size={16} className="text-[#f97316]" />} accent={summary.clocked_in_now > 0} ringValue={summary.clocked_in_now} ringMax={summary.onboarded || 1} ringColor="#f97316" />
        </div>
      )}

      {/* Pending verification alert */}
      {summary && (summary.pending_verification || 0) > 0 && (
        <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 flex items-center justify-center flex-shrink-0">
            <Check size={20} className="text-[#3B82F6]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[#1a1a1a] text-sm">{summary.pending_verification} crew member{summary.pending_verification > 1 ? 's' : ''} waiting for verification</div>
            <div className="text-xs text-black/40">Tap an employee below to review their documents and approve or reject.</div>
          </div>
        </div>
      )}

      <PendingInvitesSection invites={invites} onResent={fetchAll} flash={flash} />
      <InviteForm onInvited={fetchAll} flash={flash} />
      <BroadcastSection flash={flash} />
      <EmployeeList employees={employees} onSelect={setSelectedId} />
      <AssignmentsSection assignments={assignments} activeEmployees={activeEmployees} onCreated={fetchAll} flash={flash} />
      <StorageSection facilities={facilities} onSaved={fetchAll} flash={flash} />
      <DonationSection centers={centers} onSaved={fetchAll} flash={flash} />

      {selectedId && (
        <EmployeeDetailSlideOver id={selectedId} onClose={() => setSelectedId(null)} onSaved={fetchAll} flash={flash} />
      )}
    </div>
  );
}

// ============================================================
// STAT CARD with optional ring indicator
// ============================================================
function StatCard({ label, value, icon, accent, ringValue, ringMax, ringColor }) {
  return (
    <div className={CARD + ' p-4 flex items-center gap-3'}>
      {ringValue != null && ringMax != null && (
        <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
          <Ring value={ringValue} max={ringMax} color={ringColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}
      {ringValue == null && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-black/[0.06] flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <div className={`text-2xl font-bold tabular-nums ${accent ? ORANGE : TXT}`}>{value}</div>
        <div className={`text-xs ${TXT3}`}>{label}</div>
      </div>
    </div>
  );
}

// ============================================================
// PENDING INVITES
// ============================================================
function PendingInvitesSection({ invites, onResent, flash }) {
  if (!invites || invites.length === 0) return null;
  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-black/[0.06] font-semibold text-[#1a1a1a] flex items-center gap-2">
        <Mail size={16} className="text-[#F59E0B]" />
        Pending invites ({invites.length})
      </div>
      <div className="divide-y divide-black/[0.04]">
        {invites.map((inv) => (
          <div key={inv.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[#1a1a1a] truncate">{inv.first_name} {inv.last_name}</div>
              <div className="text-xs text-black/40 truncate">{inv.email}</div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-black/70 tabular-nums">${inv.pay_rate}/hr</div>
              <div className="text-xs text-black/30">Expires {fmtDate(inv.expires_at)}</div>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/crew', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ first_name: inv.first_name, last_name: inv.last_name, email: inv.email, phone: inv.phone, pay_rate: inv.pay_rate }),
                });
                const d = await res.json();
                if (res.ok) { flash('success', `Invite resent to ${inv.email}`); onResent(); }
                else { flash('error', d.error || 'Resend failed'); }
              }}
              className="bg-[#f97316] text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform"
            >
              Resend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// INVITE FORM
// ============================================================
function InviteForm({ onInvited, flash }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', pay_rate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/admin/crew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) {
      flash('success', `Invite sent to ${form.email}`);
      setForm({ first_name: '', last_name: '', email: '', phone: '', pay_rate: '' });
      setOpen(false);
      onInvited();
    } else {
      flash('error', d.error || 'Invite failed');
    }
  };

  return (
    <div className={CARD + ' overflow-hidden'}>
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between font-semibold text-[#1a1a1a]">
        <span className="flex items-center gap-2"><UserPlus size={18} className="text-[#f97316]" /> Invite new crew member</span>
        <span className="text-black/40 text-sm">{open ? 'Cancel' : 'Open'}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="p-4 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First name" required>
            <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </Field>
          <Field label="Last name" required>
            <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </Field>
          <Field label="Email" required>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </Field>
          <Field label="Pay rate ($/hr)">
            <input type="number" step="0.25" value={form.pay_rate} onChange={(e) => set('pay_rate', e.target.value)} placeholder="18" className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting} className="bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">
              {submitting ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-black/70">{label}{required && <span className="text-[#EF4444]"> *</span>}</span>
      {children}
    </label>
  );
}

// ============================================================
// EMPLOYEE LIST
// ============================================================
function EmployeeList({ employees, onSelect }) {
  if (employees.length === 0) {
    return (
      <div className={CARD + ' p-6 text-center text-black/40 text-sm'}>
        No crew members yet. Invite someone to get started.
      </div>
    );
  }
  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-black/[0.06] font-semibold text-[#1a1a1a]">
        Crew members ({employees.length})
      </div>
      <div className="divide-y divide-black/[0.04]">
        {employees.map((e) => (
          <button key={e.id} onClick={() => onSelect(e.id)} className="w-full text-left px-4 py-3 hover:bg-black/[0.03] flex items-center gap-3 text-sm transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[#1a1a1a] truncate">{e.first_name} {e.last_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] || 'bg-black/10 text-black/60'}`}>{statusLabel(e.status)}</span>
                {e.clocked_in && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                    Clocked in{e.clock_in_duration_min != null ? ` · ${fmtMins(e.clock_in_duration_min)}` : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-black/40 truncate">{e.email}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-black/30">
                <OnboardBadge ok={e.onboarding?.contract_signed} label="Contract" />
                <OnboardBadge ok={e.onboarding?.td1_federal} label="TD1" />
                <OnboardBadge ok={e.onboarding?.acknowledgments} label="Ack" />
                <span className="text-black/40 tabular-nums">{fmtMins(e.period?.total_minutes)} this period</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-black/70 font-medium tabular-nums">${e.pay_rate}/hr</div>
              <div className="text-xs text-black/30 flex items-center gap-1 justify-end">View <ChevronRight size={12} /></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function OnboardBadge({ ok, label }) {
  return (
    <span className={ok ? GREEN : 'text-black/20'}>
      {ok ? '✓' : '○'} {label}
    </span>
  );
}

// ============================================================
// EMPLOYEE DETAIL SLIDE-OVER PANEL
// ============================================================
function EmployeeDetailSlideOver({ id, onClose, onSaved, flash }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docAction, setDocAction] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/crew/${id}`);
      const d = await res.json();
      if (mounted) {
        setDetail(d);
        setEditForm({
          first_name: d.employee?.first_name ?? '',
          last_name: d.employee?.last_name ?? '',
          email: d.employee?.email ?? '',
          phone: d.employee?.phone ?? '',
          pay_rate: d.employee?.pay_rate ?? '',
          status: d.employee?.status ?? '',
          address: d.employee?.address ?? '',
          hire_date: d.employee?.hire_date ?? '',
        });
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const setField = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const body = {};
    const emp = detail.employee;
    for (const k of ['first_name', 'last_name', 'email', 'phone', 'address', 'hire_date']) {
      if (editForm[k] !== emp[k]) body[k] = editForm[k];
    }
    if (editForm.pay_rate !== '' && Number(editForm.pay_rate) !== emp.pay_rate) body.pay_rate = Number(editForm.pay_rate);
    if (editForm.status && editForm.status !== emp.status) body.status = editForm.status;
    if (Object.keys(body).length === 0) { setSaving(false); return; }
    if (body.email || body.first_name || body.last_name) body.send_reset = true;
    const res = await fetch(`/api/admin/crew/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      flash('success', d.reset_sent ? 'Employee updated — password reset link sent' : 'Employee updated');
      onSaved();
      onClose();
    }
    else { flash('error', d.error || 'Update failed'); }
  };

  const sendResetLink = async () => {
    setSendingReset(true);
    const res = await fetch(`/api/admin/crew/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ send_reset: true, status: editForm.status }),
    });
    const d = await res.json();
    setSendingReset(false);
    if (res.ok) flash('success', `Password reset link sent to ${detail.employee.email}`);
    else flash('error', d.error || 'Failed to send reset link');
  };

  const terminate = async () => {
    if (!window.confirm('Terminate this employee? This ends any open clock sessions.')) return;
    const res = await fetch(`/api/admin/crew/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (res.ok) { flash('success', 'Employee terminated'); onSaved(); onClose(); }
    else { flash('error', d.error || 'Terminate failed'); }
  };

  const resendInvite = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/admin/crew/${id}/resend-invite`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) { flash('success', `Invite resent to ${detail.employee.email}`); onSaved(); onClose(); }
      else { flash('error', d.error || 'Resend failed'); }
    } catch { flash('error', 'Resend failed'); }
    setResending(false);
  };

  // Fetch documents with storage URLs
  const fetchDocs = useCallback(async () => {
    if (!id) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/admin/employee-docs?employee_id=${id}`);
      const d = await res.json();
      if (res.ok) setDocs(d.documents || []);
    } catch { /* ignore */ }
    setLoadingDocs(false);
  }, [id]);

  useEffect(() => {
    if (detail?.employee) fetchDocs();
  }, [detail, fetchDocs]);

  // Approve employee
  const approveEmployee = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/crew/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const d = await res.json();
      if (res.ok) {
        flash('success', `${detail.employee.first_name} approved — SMS sent`);
        onSaved();
        onClose();
      } else {
        flash('error', d.error || 'Approval failed');
      }
    } catch { flash('error', 'Approval failed'); }
    setApproving(false);
  };

  // Reject employee
  const rejectEmployee = async () => {
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/crew/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: rejectNotes }),
      });
      const d = await res.json();
      if (res.ok) {
        flash('success', `${detail.employee.first_name} rejected — SMS sent`);
        onSaved();
        onClose();
      } else {
        flash('error', d.error || 'Rejection failed');
      }
    } catch { flash('error', 'Rejection failed'); }
    setRejecting(false);
  };

  // Verify/reject individual document
  const verifyDoc = async (docId, status) => {
    setDocAction((p) => ({ ...p, [docId]: status }));
    try {
      const res = await fetch('/api/admin/employee-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, status }),
      });
      if (res.ok) {
        flash('success', status === 'verified' ? 'Document verified' : 'Document rejected');
        fetchDocs();
      } else {
        const d = await res.json();
        flash('error', d.error || 'Failed');
      }
    } catch { flash('error', 'Failed'); }
    setDocAction((p) => { const n = { ...p }; delete n[docId]; return n; });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white border-l border-black/[0.08] w-full max-w-md h-full overflow-y-auto slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <span className="text-xs text-black/40 uppercase tracking-wider">Employee Detail</span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-black/[0.06] flex items-center justify-center text-black/60 hover:text-[#1a1a1a]">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <div className="p-5 space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f97316]/15 flex items-center justify-center text-[#f97316] font-bold text-2xl flex-shrink-0">
                {detail.employee.first_name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1a1a1a] truncate">{detail.employee.first_name} {detail.employee.last_name}</h3>
                <p className="text-sm text-black/40 truncate">{detail.employee.email}</p>
                <p className="text-sm text-black/40">{detail.employee.phone || 'No phone'}</p>
              </div>
            </div>

            {/* Onboarding ring */}
            {(() => {
              const checks = [
                detail.employee.contract_signed,
                detail.employee.td1_federal_data,
                detail.employee.td1_ab_data,
                detail.employee.acknowledgments,
              ];
              const done = checks.filter(Boolean).length;
              const pct = Math.round((done / checks.length) * 100);
              return (
                <div className={CARD + ' p-4 flex items-center gap-4'}>
                  <div className="relative" style={{ width: 64, height: 64 }}>
                    <Ring value={done} max={checks.length} size={64} stroke={6} color={pct === 100 ? '#22C55E' : '#f97316'} />
                    <div className="absolute inset-0 flex items-center justify-center text-[#1a1a1a] font-bold text-sm tabular-nums">{pct}%</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a1a1a] text-sm">Onboarding Progress</div>
                    <div className="text-xs text-black/40 mt-0.5">{done}/{checks.length} steps complete</div>
                    {detail.employee.onboarding_completed_at && (
                      <div className="text-xs text-[#22C55E] mt-1">Completed {fmtDate(detail.employee.onboarding_completed_at)}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Editable profile info */}
            <Section title="Profile (editable)">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input value={editForm.first_name ?? ''} onChange={(e) => setField('first_name', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Last name">
                  <input value={editForm.last_name ?? ''} onChange={(e) => setField('last_name', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Email">
                  <input type="email" value={editForm.email ?? ''} onChange={(e) => setField('email', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Phone">
                  <input value={editForm.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Pay rate ($/hr)">
                  <input type="number" step="0.25" value={editForm.pay_rate ?? ''} onChange={(e) => setField('pay_rate', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Status">
                  <select value={editForm.status ?? ''} onChange={(e) => setField('status', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT}>
                    <option value="pending">Pending</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="active">Active</option>
                    <option value="onboarded">Onboarded</option>
                    <option value="rejected">Rejected</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </Field>
                <Field label="Hire date">
                  <input type="date" value={editForm.hire_date ?? ''} onChange={(e) => setField('hire_date', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
                <Field label="Address">
                  <input value={editForm.address ?? ''} onChange={(e) => setField('address', e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
                </Field>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={save} disabled={saving} className="flex-1 bg-[#f97316] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button onClick={sendResetLink} disabled={sendingReset} className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-black/[0.10] text-[#1a1a1a] disabled:opacity-50 active:scale-95 transition-transform whitespace-nowrap">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> {sendingReset ? 'Sending...' : 'Send reset link'}</span>
                </button>
              </div>
              <p className="text-xs text-black/30 mt-2">Changing email or name will automatically send a password reset link to the crew member.</p>
            </Section>

            {/* Onboarding details */}
            <Section title="Onboarding">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DetailRow label="Contract" value={detail.employee.contract_signed ? `Signed · ${fmtDate(detail.employee.contract_signed_at)}` : 'Not signed'} />
                <DetailRow label="TD1 Federal" value={detail.employee.td1_federal_data ? 'Filed' : 'Not filed'} />
                <DetailRow label="TD1 Alberta" value={detail.employee.td1_ab_data ? 'Filed' : 'Not filed'} />
                <DetailRow label="Acknowledgments" value={detail.employee.acknowledgments ? 'Signed' : 'Not signed'} />
              </div>
              {!detail.employee.onboarding_completed_at && (
                <button
                  onClick={resendInvite}
                  disabled={resending}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#f97316] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <Send size={14} />
                  {resending ? 'Sending...' : 'Resend invite (clears old account)'}
                </button>
              )}
            </Section>

            {/* Verification banner — shows when employee is pending_verification */}
            {detail.employee.status === 'pending_verification' && (
              <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center">
                    <Check size={16} className="text-[#3B82F6]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a1a1a] text-sm">Pending Verification</div>
                    <div className="text-xs text-black/40">Review the documents below, then approve or reject.</div>
                  </div>
                </div>
                {!showRejectBox ? (
                  <div className="flex gap-2">
                    <button
                      onClick={approveEmployee}
                      disabled={approving}
                      className="flex-1 bg-[#22C55E] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <Check size={16} />
                      {approving ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowRejectBox(true)}
                      disabled={rejecting}
                      className="flex-1 bg-[#EF4444] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection (sent via SMS to crew member)..."
                      className={'w-full px-3 py-2 text-sm ' + INPUT}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowRejectBox(false); setRejectNotes(''); }}
                        className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-black/[0.10] text-[#1a1a1a] active:scale-95 transition-transform"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={rejectEmployee}
                        disabled={rejecting}
                        className="flex-1 bg-[#EF4444] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        {rejecting ? 'Sending rejection...' : 'Confirm Rejection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rejected banner */}
            {detail.employee.status === 'rejected' && (
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EF4444]/15 flex items-center justify-center">
                    <X size={16} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a1a1a] text-sm">Rejected</div>
                    {detail.employee.verification_notes && (
                      <div className="text-xs text-black/40 mt-1">{detail.employee.verification_notes}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents with images and per-doc verify/reject */}
            <Section title={`Documents (${docs.length})`}>
              {loadingDocs ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-[#f97316]/20 border-t-[#f97316] rounded-full animate-spin" />
                </div>
              ) : docs.length === 0 ? (
                <p className="text-sm text-black/30">No documents uploaded.</p>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div key={doc.id} className="border border-black/[0.06] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-black/30" />
                          <span className="text-sm font-medium text-black/80">{doc.doc_type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          doc.status === 'verified' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                          doc.status === 'rejected' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                          doc.status === 'uploaded' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                          'bg-black/5 text-black/40'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      {doc.storage_url && (
                        <a href={doc.storage_url} target="_blank" rel="noreferrer" className="block mb-2">
                          <img src={doc.storage_url} alt={doc.doc_type} className="w-full max-h-40 object-cover rounded-lg border border-black/[0.06]" />
                        </a>
                      )}
                      {doc.status === 'uploaded' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => verifyDoc(doc.id, 'verified')}
                            disabled={!!docAction[doc.id]}
                            className="flex-1 bg-[#22C55E] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                          >
                            {docAction[doc.id] === 'verified' ? 'Verifying...' : 'Verify'}
                          </button>
                          <button
                            onClick={() => verifyDoc(doc.id, 'rejected')}
                            disabled={!!docAction[doc.id]}
                            className="flex-1 bg-[#EF4444]/10 text-[#EF4444] px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform border border-[#EF4444]/20"
                          >
                            {docAction[doc.id] === 'rejected' ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-black/40 mt-2">{doc.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Recent sessions */}
            <Section title="Recent clock sessions">
              {detail.recent_sessions.length === 0 ? (
                <p className="text-sm text-black/30">No sessions recorded.</p>
              ) : (
                <div className="divide-y divide-black/[0.04]">
                  {detail.recent_sessions.slice(0, 8).map((s) => (
                    <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-black/30" />
                        <div>
                          <div className="text-black/80">Booking #{s.booking_id?.slice(0, 8)}</div>
                          <div className="text-xs text-black/30">{fmtDateTime(s.clock_in_at)} → {s.clock_out_at ? fmtDateTime(s.clock_out_at) : 'active'}</div>
                        </div>
                      </div>
                      <div className="text-black/70 font-medium tabular-nums">{fmtMins(s.duration_minutes)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Assignments */}
            <Section title="Crew assignments">
              {detail.assignments.length === 0 ? (
                <p className="text-sm text-black/30">No assignments.</p>
              ) : (
                <div className="divide-y divide-black/[0.04]">
                  {detail.assignments.slice(0, 8).map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-black/30" />
                        <div>
                          <div className="text-black/80">{formatDateLong(a.assignment_date)}</div>
                          <div className="text-xs text-black/30">{a.driver_employee_id === id ? 'Driver' : 'Secondary'}{a.uhaul_location ? ` · U-Haul: ${a.uhaul_location}` : ''}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Danger zone */}
            <Section title="Danger zone">
              <button onClick={terminate} className="text-sm text-[#EF4444] font-semibold underline">Terminate employee</button>
            </Section>
          </div>
        ) : (
          <div className="p-8 text-center text-[#EF4444]">Failed to load employee.</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-black/[0.03] rounded-xl border border-black/[0.04] p-4">
      <div className="font-semibold text-black/80 text-sm mb-2">{title}</div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-black/30">{label}</div>
      <div className="text-black/80">{value}</div>
    </div>
  );
}

// ============================================================
// ASSIGNMENTS
// ============================================================
function AssignmentsSection({ assignments, activeEmployees, onCreated, flash }) {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [driverId, setDriverId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const [uhaul, setUhaul] = useState('');
  const [saving, setSaving] = useState(false);

  const upcoming = useMemo(() => {
    return assignments.filter((a) => a.assignment_date >= today).sort((a, b) => a.assignment_date.localeCompare(b.assignment_date));
  }, [assignments, today]);

  const create = async (e) => {
    e.preventDefault();
    if (!date || !driverId) { flash('error', 'Date and driver are required'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/crew/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_date: date, driver_employee_id: driverId, secondary_employee_id: secondaryId || null, uhaul_location: uhaul || null }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { flash('success', 'Assignment created'); setDriverId(''); setSecondaryId(''); setUhaul(''); onCreated(); }
    else { flash('error', d.error || 'Create failed'); }
  };

  const nameOf = (p) => (p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name || '—' : '—');

  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-black/[0.06] font-semibold text-[#1a1a1a] flex items-center gap-2">
        <Truck size={16} className="text-[#f97316]" /> Crew assignments
      </div>

      <form onSubmit={create} className="p-4 border-b border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT} />
        </Field>
        <Field label="Driver">
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT}>
            <option value="">Select driver...</option>
            {activeEmployees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>))}
          </select>
        </Field>
        <Field label="Secondary">
          <select value={secondaryId} onChange={(e) => setSecondaryId(e.target.value)} className={'w-full px-3 py-2 text-sm ' + INPUT}>
            <option value="">None</option>
            {activeEmployees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>))}
          </select>
        </Field>
        <Field label="U-Haul location">
          <input value={uhaul} onChange={(e) => setUhaul(e.target.value)} placeholder="e.g. 123 Main St NE" className={'w-full px-3 py-2 text-sm ' + INPUT} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button type="submit" disabled={saving} className="bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">
            {saving ? 'Saving...' : 'Create assignment'}
          </button>
        </div>
      </form>

      <div className="divide-y divide-black/[0.04]">
        {upcoming.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-black/30">No upcoming assignments.</p>
        ) : (
          upcoming.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm">
              <div className="w-28 font-medium text-[#1a1a1a] tabular-nums">{formatDateLong(a.assignment_date)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-black/80"><span className="text-xs text-black/30">Driver:</span> {nameOf(a.driver)}</div>
                {a.secondary && <div className="text-black/60 text-xs"><span className="text-black/30">Secondary:</span> {nameOf(a.secondary)}</div>}
                {a.uhaul_location && <div className="text-black/40 text-xs">U-Haul: {a.uhaul_location}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// STORAGE FACILITIES
// ============================================================
function StorageSection({ facilities, onSaved, flash }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', access_code: '', capacity_sqft: '' });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const reset = () => { setForm({ name: '', address: '', access_code: '', capacity_sqft: '' }); setEditing(null); };
  const edit = (f) => { setEditing(f); setForm({ name: f.name || '', address: f.address || '', access_code: f.access_code || '', capacity_sqft: f.capacity_sqft ?? '' }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, capacity_sqft: form.capacity_sqft === '' ? null : Number(form.capacity_sqft) };
    if (editing) body.id = editing.id;
    const res = await fetch('/api/admin/crew/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { flash('success', editing ? 'Storage facility updated' : 'Storage facility added'); reset(); setOpen(false); onSaved(); }
    else { flash('error', d.error || 'Save failed'); }
  };

  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
        <span className="font-semibold text-[#1a1a1a] flex items-center gap-2"><Warehouse size={16} className="text-[#f97316]" /> Storage facilities</span>
        <button onClick={() => { reset(); setOpen((o) => !o); }} className="text-sm text-[#f97316] font-semibold">{open ? 'Cancel' : '+ Add'}</button>
      </div>

      {open && (
        <form onSubmit={submit} className="p-4 border-b border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" required><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <Field label="Address" required><AddressAutocomplete value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} onSelect={(f) => setForm((p) => ({ ...p, address: f.place_name }))} placeholder="Storage facility address" dark /></Field>
          <Field label="Access code"><input value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <Field label="Capacity (sqft)"><input type="number" value={form.capacity_sqft} onChange={(e) => setForm((p) => ({ ...p, capacity_sqft: e.target.value }))} className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">{saving ? 'Saving...' : editing ? 'Update' : 'Add facility'}</button>
          </div>
        </form>
      )}

      <div className="divide-y divide-black/[0.04]">
        {facilities.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-black/30">No storage facilities.</p>
        ) : (
          facilities.map((f) => (
            <button key={f.id} onClick={() => edit(f)} className="w-full text-left px-4 py-3 hover:bg-black/[0.03] flex items-center gap-3 text-sm transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1a1a1a] truncate">{f.name}</div>
                <div className="text-xs text-black/40 truncate">{f.address}</div>
              </div>
              <div className="text-right text-xs text-black/30">
                {f.access_code && <div>Code: {f.access_code}</div>}
                {f.capacity_sqft != null && <div className="tabular-nums">{f.capacity_sqft} sqft</div>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// DONATION CENTERS
// ============================================================
function DonationSection({ centers, onSaved, flash }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', hours: '', accepted_items: '' });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const reset = () => { setForm({ name: '', address: '', phone: '', hours: '', accepted_items: '' }); setEditing(null); };
  const edit = (c) => { setEditing(c); setForm({ name: c.name || '', address: c.address || '', phone: c.phone || '', hours: c.hours || '', accepted_items: c.accepted_items || '' }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form };
    if (editing) body.id = editing.id;
    const res = await fetch('/api/admin/crew/donation-centers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { flash('success', editing ? 'Donation center updated' : 'Donation center added'); reset(); setOpen(false); onSaved(); }
    else { flash('error', d.error || 'Save failed'); }
  };

  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
        <span className="font-semibold text-[#1a1a1a] flex items-center gap-2"><Heart size={16} className="text-[#f97316]" /> Donation centers</span>
        <button onClick={() => { reset(); setOpen((o) => !o); }} className="text-sm text-[#f97316] font-semibold">{open ? 'Cancel' : '+ Add'}</button>
      </div>

      {open && (
        <form onSubmit={submit} className="p-4 border-b border-black/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" required><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <Field label="Address" required><AddressAutocomplete value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} onSelect={(f) => setForm((p) => ({ ...p, address: f.place_name }))} placeholder="Donation center address" dark /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <Field label="Hours"><input value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} placeholder="Mon-Sun 9-9" className={'w-full px-3 py-2 text-sm ' + INPUT} /></Field>
          <Field label="Accepted items"><input value={form.accepted_items} onChange={(e) => setForm((p) => ({ ...p, accepted_items: e.target.value }))} placeholder="Furniture, clothing, etc." className={'w-full px-3 py-2 text-sm sm:col-span-2 ' + INPUT} /></Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-[#f97316] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">{saving ? 'Saving...' : editing ? 'Update' : 'Add center'}</button>
          </div>
        </form>
      )}

      <div className="divide-y divide-black/[0.04]">
        {centers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-black/30">No donation centers.</p>
        ) : (
          centers.map((c) => (
            <button key={c.id} onClick={() => edit(c)} className="w-full text-left px-4 py-3 hover:bg-black/[0.03] flex items-center gap-3 text-sm transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1a1a1a] truncate">{c.name}</div>
                <div className="text-xs text-black/40 truncate">{c.address}</div>
                {c.accepted_items && <div className="text-xs text-black/30 truncate">Accepts: {c.accepted_items}</div>}
              </div>
              <div className="text-right text-xs text-black/30">
                {c.phone && <div>{c.phone}</div>}
                {c.hours && <div>{c.hours}</div>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// BROADCAST SECTION — send push notifications to crew
// ============================================================
function BroadcastSection({ flash }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ target: 'all', employee_id: '', title: '', body: '' });
  const [sending, setSending] = useState(false);

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/admin/crew/push');
    if (res.ok) { const d = await res.json(); setEmployees(d.employees || []); }
  }, []);

  useEffect(() => { if (open) loadEmployees(); }, [open, loadEmployees]);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) { flash('error', 'Title and message are required'); return; }
    setSending(true);
    const res = await fetch('/api/admin/crew/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setSending(false);
    if (res.ok) {
      if (d.sent > 0) {
        flash('success', `Push sent to ${d.sent} device(s)`);
      } else if (d.totalSubs === 0) {
        flash('error', 'No devices registered. Crew must open the app and allow notifications first.');
      } else {
        flash('error', d.message || `Sent to 0 devices (${d.totalSubs} registered)`);
      }
      setForm({ target: 'all', employee_id: '', title: '', body: '' });
    }
    else { flash('error', d.error || 'Send failed'); }
  };

  const totalDevices = employees.reduce((sum, e) => sum + (e.push_subscriptions || 0), 0);

  return (
    <div className={CARD + ' p-4'}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <span className="font-bold text-[#1a1a1a] text-sm flex items-center gap-2"><Radio size={18} className="text-[#f97316]" /> Broadcast Message</span>
        <span className="text-black/40 text-xs">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <form onSubmit={send} className="mt-4 space-y-3">
          <div className="text-xs text-black/30">
            Send a push notification to crew members&apos; phones.
            {totalDevices === 0 && <span className="text-[#EF4444] block mt-1">No devices registered yet. Crew members need to open the app and allow notifications.</span>}
            {totalDevices > 0 && <span className="text-[#22C55E] block mt-1">{totalDevices} device(s) registered.</span>}
          </div>
          <div>
            <label className="block text-xs font-medium text-black/50 mb-1">Send to</label>
            <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={'w-full px-3 py-2 text-sm ' + INPUT}>
              <option value="all">All crew members</option>
              {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.name} {emp.push_subscriptions > 0 ? `(${emp.push_subscriptions} device)` : '(no device)'}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-black/50 mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Schedule update" required className={'w-full px-3 py-2 text-sm ' + INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-black/50 mb-1">Message</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Type your message..." required rows={3} className={'w-full px-3 py-2 text-sm resize-none ' + INPUT} />
          </div>
          <button type="submit" disabled={sending} className="w-full bg-[#f97316] text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 active:scale-95 transition-transform">
            {sending ? 'Sending...' : 'Send Push Notification'}
          </button>
        </form>
      )}
    </div>
  );
}
