'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDateLong } from '@/lib/dates';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  onboarded: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  terminated: 'bg-red-100 text-red-700',
};

function statusLabel(status) {
  if (status === 'onboarded') return 'Active';
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
  const d = new Date(iso);
  return d.toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton',
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function todayStr() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  if (loading) return <p className="text-gray-500 py-8">Loading crew...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Crew Management</h2>
        {message && (
          <span className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Total" value={summary.total} />
          <Stat label="Active" value={summary.onboarded} />
          <Stat label="Pending" value={summary.pending} accent={summary.pending > 0} />
          <Stat label="Clocked in" value={summary.clocked_in_now} accent={summary.clocked_in_now > 0} />
        </div>
      )}

      <PendingInvitesSection invites={invites} onResent={fetchAll} flash={flash} />
      <InviteForm onInvited={fetchAll} flash={flash} />
      <EmployeeList employees={employees} onSelect={setSelectedId} />
      <AssignmentsSection
        assignments={assignments}
        activeEmployees={activeEmployees}
        onCreated={fetchAll}
        flash={flash}
      />
      <StorageSection facilities={facilities} onSaved={fetchAll} flash={flash} />
      <DonationSection centers={centers} onSaved={fetchAll} flash={flash} />

      {selectedId && (
        <EmployeeDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={fetchAll}
          flash={flash}
        />
      )}
    </div>
  );
}

// ============================================================
// STAT
// ============================================================
function Stat({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

// ============================================================
// PENDING INVITES
// ============================================================
function PendingInvitesSection({ invites, onResent, flash }) {
  if (!invites || invites.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
        Pending invites ({invites.length})
      </div>
      <div className="divide-y divide-gray-100">
        {invites.map((inv) => (
          <div key={inv.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {inv.first_name} {inv.last_name}
              </div>
              <div className="text-xs text-gray-500 truncate">{inv.email}</div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-gray-700">${inv.pay_rate}/hr</div>
              <div className="text-xs text-gray-400">Expires {fmtDate(inv.expires_at)}</div>
            </div>
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/crew', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    first_name: inv.first_name,
                    last_name: inv.last_name,
                    email: inv.email,
                    phone: inv.phone,
                    pay_rate: inv.pay_rate,
                  }),
                });
                const d = await res.json();
                if (res.ok) {
                  flash('success', `Invite resent to ${inv.email}`);
                  onResent();
                } else {
                  flash('error', d.error || 'Resend failed');
                }
              }}
              className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
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
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', pay_rate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/admin/crew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between font-semibold text-gray-800"
      >
        <span>+ Invite new crew member</span>
        <span className="text-gray-400 text-sm">{open ? 'Cancel' : 'Open'}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="p-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First name" required>
            <input
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Last name" required>
            <input
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Pay rate ($/hr)">
            <input
              type="number"
              step="0.25"
              value={form.pay_rate}
              onChange={(e) => set('pay_rate', e.target.value)}
              placeholder="18"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
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
      <span className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
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
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
        No crew members yet. Invite someone to get started.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
        Crew members ({employees.length})
      </div>
      <div className="divide-y divide-gray-100">
        {employees.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {e.first_name} {e.last_name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel(e.status)}
                </span>
                {e.clocked_in && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    Clocked in{e.clock_in_duration_min != null ? ` · ${fmtMins(e.clock_in_duration_min)}` : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">{e.email}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <OnboardBadge ok={e.onboarding?.contract_signed} label="Contract" />
                <OnboardBadge ok={e.onboarding?.td1_federal} label="TD1" />
                <OnboardBadge ok={e.onboarding?.acknowledgments} label="Ack" />
                <span className="text-gray-500">{fmtMins(e.period?.total_minutes)} this period</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-gray-700 font-medium">${e.pay_rate}/hr</div>
              <div className="text-xs text-gray-400">View →</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function OnboardBadge({ ok, label }) {
  return (
    <span className={ok ? 'text-green-600' : 'text-gray-300'}>
      {ok ? '✓' : '○'} {label}
    </span>
  );
}

// ============================================================
// EMPLOYEE DETAIL MODAL
// ============================================================
function EmployeeDetailModal({ id, onClose, onSaved, flash }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payRate, setPayRate] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/crew/${id}`);
      const d = await res.json();
      if (mounted) {
        setDetail(d);
        setPayRate(d.employee?.pay_rate ?? '');
        setStatus(d.employee?.status ?? '');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const save = async () => {
    setSaving(true);
    const body = {};
    if (payRate !== '' && payRate !== detail.employee?.pay_rate) body.pay_rate = Number(payRate);
    if (status && status !== detail.employee?.status) body.status = status;
    if (Object.keys(body).length === 0) {
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/admin/crew/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      flash('success', 'Employee updated');
      onSaved();
      onClose();
    } else {
      flash('error', d.error || 'Update failed');
    }
  };

  const terminate = async () => {
    if (!window.confirm('Terminate this employee? This ends any open clock sessions.')) return;
    const res = await fetch(`/api/admin/crew/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (res.ok) {
      flash('success', 'Employee terminated');
      onSaved();
      onClose();
    } else {
      flash('error', d.error || 'Terminate failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : detail ? (
          <div className="p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {detail.employee.first_name} {detail.employee.last_name}
                </h3>
                <p className="text-sm text-gray-500">{detail.employee.email}</p>
                <p className="text-sm text-gray-500">{detail.employee.phone || 'No phone'}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Onboarding status */}
            <Section title="Onboarding">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DetailRow label="Status" value={
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[detail.employee.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel(detail.employee.status)}
                  </span>
                } />
                <DetailRow label="Hire date" value={fmtDate(detail.employee.hire_date)} />
                <DetailRow label="Contract signed" value={detail.employee.contract_signed ? `Yes · ${fmtDate(detail.employee.contract_signed_at)}` : 'No'} />
                <DetailRow label="TD1 Federal" value={detail.employee.td1_federal_data ? 'Filed' : 'Not filed'} />
                <DetailRow label="TD1 Alberta" value={detail.employee.td1_ab_data ? 'Filed' : 'Not filed'} />
                <DetailRow label="Acknowledgments" value={detail.employee.acknowledgments ? 'Signed' : 'Not signed'} />
                <DetailRow label="Onboarded" value={detail.employee.onboarding_completed_at ? fmtDate(detail.employee.onboarding_completed_at) : 'In progress'} />
                <DetailRow label="Address" value={detail.employee.address || '—'} />
              </div>
            </Section>

            {/* Documents */}
            <Section title={`Documents (${detail.documents.length})`}>
              {detail.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detail.documents.map((doc) => (
                    <div key={doc.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-gray-800">{doc.doc_type}</div>
                        <div className="text-xs text-gray-400">Uploaded {fmtDate(doc.created_at)}</div>
                      </div>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-orange-600 text-xs font-semibold">
                          View →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Recent sessions */}
            <Section title="Recent clock sessions">
              {detail.recent_sessions.length === 0 ? (
                <p className="text-sm text-gray-400">No sessions recorded.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detail.recent_sessions.slice(0, 8).map((s) => (
                    <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="text-gray-800">Booking #{s.booking_id?.slice(0, 8)}</div>
                        <div className="text-xs text-gray-400">{fmtDateTime(s.clock_in_at)} → {s.clock_out_at ? fmtDateTime(s.clock_out_at) : 'active'}</div>
                      </div>
                      <div className="text-gray-700 font-medium">{fmtMins(s.duration_minutes)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Assignments */}
            <Section title="Crew assignments">
              {detail.assignments.length === 0 ? (
                <p className="text-sm text-gray-400">No assignments.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detail.assignments.slice(0, 8).map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="text-gray-800">{formatDateLong(a.assignment_date)}</div>
                        <div className="text-xs text-gray-400">
                          {a.driver_employee_id === id ? 'Driver' : 'Secondary'}
                          {a.uhaul_location ? ` · U-Haul: ${a.uhaul_location}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Admin controls */}
            <Section title="Admin controls">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <Field label="Pay rate ($/hr)">
                  <input
                    type="number"
                    step="0.25"
                    value={payRate}
                    onChange={(e) => setPayRate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="onboarded">Onboarded</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </Field>
                <button
                  onClick={save}
                  disabled={saving}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <button
                onClick={terminate}
                className="mt-3 text-sm text-red-600 font-semibold underline"
              >
                Terminate employee
              </button>
            </Section>
          </div>
        ) : (
          <div className="p-8 text-center text-red-500">Failed to load employee.</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="font-semibold text-gray-800 text-sm mb-2">{title}</div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-gray-800">{value}</div>
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
    return assignments
      .filter((a) => a.assignment_date >= today)
      .sort((a, b) => a.assignment_date.localeCompare(b.assignment_date));
  }, [assignments, today]);

  const create = async (e) => {
    e.preventDefault();
    if (!date || !driverId) {
      flash('error', 'Date and driver are required');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/crew/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_date: date,
        driver_employee_id: driverId,
        secondary_employee_id: secondaryId || null,
        uhaul_location: uhaul || null,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      flash('success', 'Assignment created');
      setDriverId('');
      setSecondaryId('');
      setUhaul('');
      onCreated();
    } else {
      flash('error', d.error || 'Create failed');
    }
  };

  const nameOf = (p) => (p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.name || '—' : '—');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
        Crew assignments
      </div>

      <form onSubmit={create} className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Driver">
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select driver...</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Secondary">
          <select
            value={secondaryId}
            onChange={(e) => setSecondaryId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="U-Haul location">
          <input
            value={uhaul}
            onChange={(e) => setUhaul(e.target.value)}
            placeholder="e.g. 123 Main St NE"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create assignment'}
          </button>
        </div>
      </form>

      <div className="divide-y divide-gray-100">
        {upcoming.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No upcoming assignments.</p>
        ) : (
          upcoming.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm">
              <div className="w-28 font-medium text-gray-900">{formatDateLong(a.assignment_date)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-800">
                  <span className="text-xs text-gray-400">Driver:</span> {nameOf(a.driver)}
                </div>
                {a.secondary && (
                  <div className="text-gray-600 text-xs">
                    <span className="text-gray-400">Secondary:</span> {nameOf(a.secondary)}
                  </div>
                )}
                {a.uhaul_location && (
                  <div className="text-gray-500 text-xs">U-Haul: {a.uhaul_location}</div>
                )}
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

  const reset = () => {
    setForm({ name: '', address: '', access_code: '', capacity_sqft: '' });
    setEditing(null);
  };

  const edit = (f) => {
    setEditing(f);
    setForm({
      name: f.name || '',
      address: f.address || '',
      access_code: f.access_code || '',
      capacity_sqft: f.capacity_sqft ?? '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      capacity_sqft: form.capacity_sqft === '' ? null : Number(form.capacity_sqft),
    };
    if (editing) body.id = editing.id;
    const res = await fetch('/api/admin/crew/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      flash('success', editing ? 'Storage facility updated' : 'Storage facility added');
      reset();
      setOpen(false);
      onSaved();
    } else {
      flash('error', d.error || 'Save failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Storage facilities</span>
        <button
          onClick={() => { reset(); setOpen((o) => !o); }}
          className="text-sm text-orange-600 font-semibold"
        >
          {open ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" required>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Address" required>
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Access code">
            <input value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Capacity (sqft)">
            <input type="number" value={form.capacity_sqft} onChange={(e) => setForm((p) => ({ ...p, capacity_sqft: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add facility'}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {facilities.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No storage facilities.</p>
        ) : (
          facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => edit(f)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{f.name}</div>
                <div className="text-xs text-gray-500 truncate">{f.address}</div>
              </div>
              <div className="text-right text-xs text-gray-400">
                {f.access_code && <div>Code: {f.access_code}</div>}
                {f.capacity_sqft != null && <div>{f.capacity_sqft} sqft</div>}
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

  const reset = () => {
    setForm({ name: '', address: '', phone: '', hours: '', accepted_items: '' });
    setEditing(null);
  };

  const edit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      address: c.address || '',
      phone: c.phone || '',
      hours: c.hours || '',
      accepted_items: c.accepted_items || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form };
    if (editing) body.id = editing.id;
    const res = await fetch('/api/admin/crew/donation-centers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      flash('success', editing ? 'Donation center updated' : 'Donation center added');
      reset();
      setOpen(false);
      onSaved();
    } else {
      flash('error', d.error || 'Save failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Donation centers</span>
        <button
          onClick={() => { reset(); setOpen((o) => !o); }}
          className="text-sm text-orange-600 font-semibold"
        >
          {open ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" required>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Address" required>
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Hours">
            <input value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} placeholder="Mon-Sun 9-9" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Accepted items">
            <input value={form.accepted_items} onChange={(e) => setForm((p) => ({ ...p, accepted_items: e.target.value }))} placeholder="Furniture, clothing, etc." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add center'}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {centers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No donation centers.</p>
        ) : (
          centers.map((c) => (
            <button
              key={c.id}
              onClick={() => edit(c)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{c.name}</div>
                <div className="text-xs text-gray-500 truncate">{c.address}</div>
                {c.accepted_items && <div className="text-xs text-gray-400 truncate">Accepts: {c.accepted_items}</div>}
              </div>
              <div className="text-right text-xs text-gray-400">
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
