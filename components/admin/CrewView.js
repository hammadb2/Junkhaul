'use client';
// Redesigned Crew view — REPLACES components/admin/CrewView.js.
// Real data: GET /api/admin/crew, GET /api/admin/crew/[id], GET /api/admin/safety-incidents.

import { useState, useEffect } from 'react';
import { badgeStyle } from '@/lib/adminUiHelpers';
import { IconAlert } from './Icons';

const STATUS_BADGE = {
  active: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
  onboarded: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
  pending_verification: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
  pending: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
  terminated: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.45)'),
};
const STATUS_LABEL = { active: 'Active', onboarded: 'Active', pending_verification: 'Pending verification', pending: 'Pending', terminated: 'Terminated' };

const SEVERITY_BADGE = {
  critical: badgeStyle('rgba(239,68,68,.12)', '#EF4444'),
  high: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
  medium: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
  low: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.5)'),
};

const DOC_LABELS = {
  employment_contract: 'Employment contract',
  td1_federal: 'TD1 Federal',
  td1_ab: 'TD1 Alberta',
  id: 'Government ID',
  banking_info: 'Banking info',
  sin_document: 'SIN document',
  drivers_license_front: "Driver's license (front)",
  drivers_license_back: "Driver's license (back)",
  other: 'Other',
};

const smallBtn = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };

export default function CrewView({ flash }) {
  const [tab, setTab] = useState('roster');
  const [crew, setCrew] = useState([]);
  const [invites, setInvites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCrew = async () => {
    const crewRes = await fetch('/api/admin/crew');
    const crewData = crewRes.ok ? await crewRes.json() : null;
    if (crewData && Array.isArray(crewData.employees)) {
      const mapped = crewData.employees.map((e) => {
        const durMin = e.clock_in_duration_min;
        const durStr = durMin != null ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : '';
        return {
          id: e.id,
          name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Crew',
          email: e.email || '',
          status: e.status || 'active',
          clockedIn: !!e.clocked_in,
          clockedTime: durStr,
          currentBookingId: e.current_booking_id || null,
          rate: e.pay_rate ? `$${Number(e.pay_rate).toFixed(2)}/hr` : '',
          hours: e.period ? `${e.period.total_hours || 0}h` : '0h',
        };
      });
      setCrew(mapped);
    }
    if (crewData && Array.isArray(crewData.pending_invites)) setInvites(crewData.pending_invites);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadCrew();
        const incRes = await fetch('/api/admin/safety-incidents');
        const incData = incRes.ok ? await incRes.json() : null;
        if (cancelled) return;
        if (incData && Array.isArray(incData.incidents)) setIncidents(incData.incidents);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/crew/${id}`);
      const d = await res.json().catch(() => ({}));
      if (res.ok) setDetail(d);
      else flash?.(d.error || 'Could not load crew member', '#EF4444');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailId(null); setDetail(null); };

  const terminate = async () => {
    if (!detail?.employee?.id) return;
    const reason = window.prompt('Reason for termination (required):');
    if (!reason) return;
    const res = await fetch(`/api/admin/crew/${detail.employee.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      flash?.('Crew member terminated');
      closeDetail();
      await loadCrew();
    } else {
      flash?.(d.error || 'Failed to terminate', '#EF4444');
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addForm.first_name || !addForm.last_name || !addForm.email) {
      flash?.('First name, last name, and email are required', '#EF4444');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        flash?.('Invite sent');
        setShowAddForm(false);
        setAddForm({ first_name: '', last_name: '', email: '', phone: '' });
        await loadCrew();
      } else {
        flash?.(d.error || 'Failed to invite crew member', '#EF4444');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const activeCrew = crew.filter((c) => c.status !== 'terminated');
  const terminatedCrew = crew.filter((c) => c.status === 'terminated');

  const stats = [
    { label: 'Total crew', value: activeCrew.length, color: '#1a1a1a' },
    { label: 'Active', value: activeCrew.filter((c) => c.status === 'active' || c.status === 'onboarded').length, color: '#22C55E' },
    { label: 'Pending', value: activeCrew.filter((c) => c.status === 'pending_verification' || c.status === 'pending').length, color: '#3B82F6' },
    { label: 'Clocked in now', value: activeCrew.filter((c) => c.clockedIn).length, color: '#f97316' },
  ];

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,.12)', fontSize: 13, marginBottom: 8 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, background: '#F0F0F2', borderRadius: 999, padding: 4, width: 'fit-content' }}>
        {[{ id: 'roster', label: 'Roster' }, { id: 'safety', label: 'Safety & incidents' }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t.id ? '#f97316' : 'transparent', color: tab === t.id ? '#fff' : 'rgba(0,0,0,.55)' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'roster' && (
        <>
          <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddForm(true)} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add crew member</button>
          </div>

          {invites.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Pending invites ({invites.length})</div>
              {invites.map((inv) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{inv.first_name} {inv.last_name}</span>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)' }}>{inv.email}{inv.phone ? ` · ${inv.phone}` : ''}</div>
                  </div>
                  <span style={badgeStyle('rgba(59,130,246,.12)', '#3B82F6')}>Invited</span>
                  <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.35)' }}>Expires {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—'}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Crew roster</div>
            {activeCrew.map((c) => (
              <div key={c.id} onClick={() => openDetail(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(249,115,22,.12)', color: '#f97316', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{c.name}</span>
                    <span style={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status] || c.status}</span>
                    {c.clockedIn && <span style={badgeStyle('rgba(249,115,22,.12)', '#f97316')}>● Clocked in · {c.clockedTime}</span>}
                    {c.currentBookingId && <span style={badgeStyle('rgba(59,130,246,.12)', '#3B82F6')}>On job {c.currentBookingId.slice(0, 8)}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)' }}>{c.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{c.rate}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>{c.hours} this period</div>
                </div>
              </div>
            ))}
            {activeCrew.length === 0 && (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No active crew yet.</div>
            )}
          </div>

          {terminatedCrew.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: 'rgba(0,0,0,.45)' }}>Terminated ({terminatedCrew.length})</div>
              {terminatedCrew.map((c) => (
                <div key={c.id} onClick={() => openDetail(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer', opacity: 0.6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(0,0,0,.06)', color: 'rgba(0,0,0,.4)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{c.name}</span>
                    <span style={{ ...STATUS_BADGE.terminated, marginLeft: 7 }}>Terminated</span>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)' }}>{c.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'safety' && (
        incidents.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <IconAlert size={20} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>No open safety incidents</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', maxWidth: 380, margin: '0 auto' }}>
              Incident reports and safety flags submitted by crew from the field will surface here for review, with severity, job reference, and resolution status.
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Safety incidents</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  {['Severity', 'Category', 'Description', 'Crew member', 'Status', 'Date'].map((h, i) => (
                    <th key={h} style={{ textAlign: 'left', padding: i === 0 ? '11px 18px' : i === 5 ? '11px 18px' : '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const emp = inc.employees || {};
                  const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                  const dt = inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                  return (
                    <tr key={inc.id} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                      <td style={{ padding: '11px 18px' }}><span style={SEVERITY_BADGE[inc.severity] || badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.5)')}>{inc.severity || 'unknown'}</span></td>
                      <td style={{ padding: '11px 12px', color: 'rgba(0,0,0,.55)' }}>{inc.category || '—'}</td>
                      <td style={{ padding: '11px 12px', color: 'rgba(0,0,0,.55)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description || '—'}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: '#1a1a1a' }}>{empName}</td>
                      <td style={{ padding: '11px 12px' }}><span style={inc.status === 'resolved' ? badgeStyle('rgba(34,197,94,.12)', '#22C55E') : inc.status === 'dismissed' ? badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.4)') : badgeStyle('rgba(245,158,11,.12)', '#F59E0B')}>{inc.status || 'open'}</span></td>
                      <td style={{ padding: '11px 18px', color: 'rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>{dt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddForm(false)}>
          <form onSubmit={submitAdd} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Add crew member</div>
            <input required placeholder="First name" value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} style={inputStyle} />
            <input required placeholder="Last name" value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} style={inputStyle} />
            <input required type="email" placeholder="Email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} style={inputStyle} />
            <input placeholder="Phone (optional)" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} style={inputStyle} />
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', marginBottom: 12 }}>An onboarding invite will be emailed to set up their account, sign the contract, and upload documents.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={smallBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...smallBtn, background: '#f97316', color: '#fff', border: 'none' }}>{saving ? 'Sending…' : 'Send invite'}</button>
            </div>
          </form>
        </div>
      )}

      {(detailId || detailLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.18)', zIndex: 30, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'min(720px,100%)', height: '100%', background: '#fff', boxShadow: '-12px 0 32px rgba(0,0,0,.16)', overflow: 'auto', padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Crew Detail</div>
              <button onClick={closeDetail} style={smallBtn}>Close</button>
            </div>
            {detailLoading ? <div style={{ padding: 30 }}>Loading…</div> : detail?.employee ? (
              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <CrewSection title="Identity">
                  <p>{detail.employee.name} · {detail.employee.email} · {detail.employee.phone || 'no phone'}</p>
                  <p>Address: {detail.employee.address || 'not captured'}</p>
                  <p>Status: <span style={STATUS_BADGE[detail.employee.status]}>{STATUS_LABEL[detail.employee.status] || detail.employee.status}</span> · Hired {detail.employee.hire_date || '—'}</p>
                </CrewSection>
                <CrewSection title="Verification">
                  {detail.employee.selfie_url && (
                    <a href={detail.employee.selfie_url} target="_blank" rel="noreferrer">
                      <img src={detail.employee.selfie_url} alt="Selfie" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,.1)', marginBottom: 8 }} />
                    </a>
                  )}
                  <p>Verified: {detail.employee.verified_at ? `${detail.employee.verified_at} by ${detail.employee.verified_by || 'unknown'}` : 'Not yet verified'}</p>
                  {detail.employee.verification_notes && <p>Notes: {detail.employee.verification_notes}</p>}
                  <p>Contract signed: {detail.employee.contract_signed ? `Yes, ${detail.employee.contract_signed_at || ''}` : 'No'}</p>
                </CrewSection>
                <CrewSection title="Documents">
                  {(detail.documents || []).length === 0 && <p>No documents uploaded yet.</p>}
                  {(detail.documents || []).map((d) => (
                    <p key={d.id}>
                      {DOC_LABELS[d.doc_type] || d.doc_type}: <span style={d.status === 'verified' ? { color: '#22C55E', fontWeight: 700 } : d.status === 'rejected' ? { color: '#EF4444', fontWeight: 700 } : { color: '#F59E0B', fontWeight: 700 }}>{d.status}</span>
                      {d.verified_at ? ` · verified ${d.verified_at}` : ''}
                      {d.drive_file_url && !d.redacted ? <> · <a href={d.drive_file_url} target="_blank" rel="noreferrer">view</a></> : ''}
                    </p>
                  ))}
                </CrewSection>
                <CrewSection title="Recent clock sessions">
                  {(detail.recent_sessions || []).length === 0 && <p>No clock sessions yet.</p>}
                  {(detail.recent_sessions || []).map((s) => (
                    <p key={s.id}>{new Date(s.clock_in_at).toLocaleString()} → {s.clock_out_at ? new Date(s.clock_out_at).toLocaleString() : 'still clocked in'} {s.duration_minutes ? `(${Math.round(s.duration_minutes / 60 * 10) / 10}h)` : ''}</p>
                  ))}
                </CrewSection>
                <CrewSection title="Job assignments">
                  {(detail.assignments || []).length === 0 && <p>No assignments on record.</p>}
                  {(detail.assignments || []).map((a) => <p key={a.id}>{a.assignment_date}: {a.status || '—'}</p>)}
                </CrewSection>
                {detail.employee.status !== 'terminated' && (
                  <CrewSection title="Actions">
                    <button onClick={terminate} style={{ ...smallBtn, background: '#EF4444', color: '#fff', border: 'none' }}>Terminate crew member</button>
                  </CrewSection>
                )}
              </div>
            ) : <div style={{ padding: 30, color: 'rgba(0,0,0,.4)' }}>Could not load this crew member.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CrewSection({ title, children }) {
  return <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, padding: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div><div style={{ fontSize: 13, color: 'rgba(0,0,0,.65)' }}>{children}</div></div>;
}
