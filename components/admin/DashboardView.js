'use client';
// Redesigned "Dashboard" (home) view.
// Real data: GET /api/admin/command-center + GET /api/admin/bookings.

import { useState, useEffect } from 'react';
import { IconTruck, IconDollar, IconUsers, IconAlert } from './Icons';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

const CREW_DOT = { active: '#22C55E', clocked_in: '#22C55E', off_shift: 'rgba(0,0,0,.2)' };

export default function DashboardView({ flash }) {
  const [stats, setStats] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [crewStatus, setCrewStatus] = useState([]);
  const [attention, setAttention] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ccRes, bkRes, crewRes] = await Promise.all([
          fetch('/api/admin/command-center'),
          fetch('/api/admin/bookings'),
          fetch('/api/admin/crew'),
        ]);
        const cc = ccRes.ok ? await ccRes.json() : null;
        const bk = bkRes.ok ? await bkRes.json() : null;
        const crewData = crewRes.ok ? await crewRes.json() : null;
        if (cancelled) return;

        if (cc) {
          const today = cc.today || {};
          const newStats = [
            { label: 'Jobs today', value: String(today.jobs ?? '0'), Icon: IconTruck, iconBg: 'rgba(249,115,22,.12)', delta: '', deltaColor: '#22C55E' },
            { label: 'Revenue to collect', value: money(today.revenue_to_collect ?? 0), Icon: IconDollar, iconBg: 'rgba(34,197,94,.12)', delta: '', deltaColor: '#22C55E' },
            { label: 'Crew clocked in', value: String((crewData?.employees || []).filter((c) => c.clocked_in).length || '0'), Icon: IconUsers, iconBg: 'rgba(59,130,246,.12)' },
            { label: 'Flagged for review', value: String((bk?.stats?.flagged) ?? '0'), Icon: IconAlert, iconBg: 'rgba(245,158,11,.12)', delta: (bk?.stats?.flagged ?? 0) > 0 ? 'Needs attention' : '', deltaColor: '#F59E0B' },
          ];
          setStats(newStats);

          const items = [];
          if (Array.isArray(cc.staleJobs) && cc.staleJobs.length > 0) {
            items.push({ title: `${cc.staleJobs.length} cron job(s) stale`, sub: cc.staleJobs.map((j) => j.job_name).join(', ') });
          }
          if (Array.isArray(cc.urgentCalls) && cc.urgentCalls.length > 0) {
            items.push({ title: `${cc.urgentCalls.length} urgent call(s) need follow-up`, sub: cc.urgentCalls.map((c) => c.caller_name || c.caller_number).join(', ') });
          }
          setAttention(items);
        }

        if (crewData && Array.isArray(crewData.employees)) {
          setCrewStatus(crewData.employees.map((e) => ({
            name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Crew',
            status: e.clocked_in ? (e.clock_in_duration_min ? `${Math.floor(e.clock_in_duration_min / 60)}h ${e.clock_in_duration_min % 60}m` : 'Clocked in') : 'Off shift',
            dot: e.clocked_in ? '#22C55E' : 'rgba(0,0,0,.2)',
          })));
        }

        if (bk && Array.isArray(bk.bookings)) {
          const todayDate = cc?.today?.date;
          const todayJobs = todayDate
            ? bk.bookings.filter((b) => b.job_date === todayDate)
            : bk.bookings.slice(0, 4);
          setJobs(todayJobs.map((b) => ({
            time: (b.job_time || '').slice(0, 5),
            name: b.name || 'Unknown',
            address: b.address || '',
            status: b.status ? b.status[0].toUpperCase() + b.status.slice(1) : 'Confirmed',
            badge: badgeStyle(
              b.status === 'completed' ? 'rgba(34,197,94,.1)' : 'rgba(59,130,246,.1)',
              b.status === 'completed' ? '#22C55E' : '#3B82F6'
            ),
          })));
        }
      } catch (e) {
        flash?.('Failed to load dashboard data', '#EF4444');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (stats.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No dashboard data available</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.Icon size={16} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            {s.delta && <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 6, color: s.deltaColor }}>{s.delta}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>Today&apos;s route</div>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', fontWeight: 500 }}>Thursday, Jul 16</span>
          </div>
          {jobs.map((j) => (
            <div key={j.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid rgba(0,0,0,.045)' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(249,115,22,.1)', color: '#f97316', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{j.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.address}</div>
              </div>
              <span style={j.badge}>{j.status}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '16px 20px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Crew status</div>
            {crewStatus.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', fontWeight: 500 }}>{c.status}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '16px 20px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Needs attention</div>
            {attention.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(0,0,0,.32)', fontSize: 12.5 }}>All clear — nothing needs review.</div>
            ) : attention.map((a) => (
              <div key={a.title} style={{ display: 'flex', alignItems: 'start', gap: 9, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                <span style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}><IconAlert size={16} /></span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)' }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
