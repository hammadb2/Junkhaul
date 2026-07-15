'use client';
// Redesigned Crew view — REPLACES components/admin/CrewView.js.
// Real data: GET /api/admin/crew, GET /api/admin/safety-incidents.

import { useState, useEffect } from 'react';
import { badgeStyle } from '@/lib/adminUiHelpers';
import { IconAlert } from './Icons';

const STATUS_BADGE = {
  active: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
  onboarded: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
  pending_verification: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
  pending: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
};
const STATUS_LABEL = { active: 'Active', onboarded: 'Active', pending_verification: 'Pending verification', pending: 'Pending' };

const SEVERITY_BADGE = {
  critical: badgeStyle('rgba(239,68,68,.12)', '#EF4444'),
  high: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
  medium: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'),
  low: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.5)'),
};

export default function CrewView() {
  const [tab, setTab] = useState('roster');
  const [crew, setCrew] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [crewRes, incRes] = await Promise.all([
          fetch('/api/admin/crew'),
          fetch('/api/admin/safety-incidents'),
        ]);
        const crewData = crewRes.ok ? await crewRes.json() : null;
        const incData = incRes.ok ? await incRes.json() : null;
        if (cancelled) return;

        if (crewData && Array.isArray(crewData.employees)) {
          const mapped = crewData.employees.map((e) => {
            const durMin = e.clock_in_duration_min;
            const durStr = durMin != null ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : '';
            return {
              name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Crew',
              email: e.email || '',
              status: e.status || 'active',
              clockedIn: !!e.clocked_in,
              clockedTime: durStr,
              rate: e.pay_rate ? `$${Number(e.pay_rate).toFixed(2)}/hr` : '',
              hours: e.period ? `${e.period.total_hours || 0}h` : '0h',
            };
          });
          setCrew(mapped);
        }

        if (incData && Array.isArray(incData.incidents)) {
          setIncidents(incData.incidents);
        }
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const stats = [
    { label: 'Total crew', value: crew.length, color: '#1a1a1a' },
    { label: 'Active', value: crew.filter((c) => c.status === 'active' || c.status === 'onboarded').length, color: '#22C55E' },
    { label: 'Pending', value: crew.filter((c) => c.status === 'pending_verification' || c.status === 'pending').length, color: '#3B82F6' },
    { label: 'Clocked in now', value: crew.filter((c) => c.clockedIn).length, color: '#f97316' },
  ];

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
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Crew roster</div>
            {crew.map((c) => (
              <div key={c.email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(249,115,22,.12)', color: '#f97316', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{c.name}</span>
                    <span style={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</span>
                    {c.clockedIn && <span style={badgeStyle('rgba(249,115,22,.12)', '#f97316')}>● Clocked in · {c.clockedTime}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)' }}>{c.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{c.rate}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>{c.hours} this period</div>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}
