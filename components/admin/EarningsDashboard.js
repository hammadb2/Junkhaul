'use client';
// Redesigned Earnings view — REPLACES components/admin/EarningsDashboard.js.
// Real data: GET /api/admin/earnings.

import { useState, useEffect } from 'react';
import { money } from '@/lib/adminUiHelpers';

export default function EarningsDashboard() {
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPipeline, setTotalPipeline] = useState(0);
  const [avgJobValue, setAvgJobValue] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [upcomingJobs, setUpcomingJobs] = useState(0);
  const [sources, setSources] = useState([]);
  const [byDate, setByDate] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/earnings');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.totalEarned != null) setTotalEarned(data.totalEarned);
        if (data.totalPipeline != null) setTotalPipeline(data.totalPipeline);
        if (data.avgJobValue != null) setAvgJobValue(data.avgJobValue);
        if (data.completedJobs != null) setCompletedJobs(data.completedJobs);
        if (data.upcomingJobs != null) setUpcomingJobs(data.upcomingJobs);

        if (data.sourceBreakdown) {
          const mapped = Object.entries(data.sourceBreakdown).map(([name, info]) => [
            name, info.count || 0, info.revenue || 0,
          ]);
          setSources(mapped);
        }

        if (data.byDate) {
          const mapped = Object.entries(data.byDate)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .slice(0, 10)
            .map(([date, info]) => {
              const dt = new Date(date + 'T12:00:00');
              return {
                date: dt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ' (' + dt.toLocaleDateString('en-CA', { weekday: 'short' }) + ')',
                jobs: info.jobs || 0,
                revenue: info.revenue || 0,
              };
            });
          setByDate(mapped);
        }
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (totalEarned === 0 && totalPipeline === 0 && sources.length === 0 && byDate.length === 0) return <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No earnings data available</div>;

  const maxSrc = sources.length > 0 ? Math.max(...sources.map((s) => s[2])) : 0;
  const stats = [
    { label: 'Total earned', value: money(totalEarned), color: '#1a1a1a', sub: `${completedJobs} jobs completed` },
    { label: 'In pipeline', value: money(totalPipeline), color: '#f97316', sub: `${upcomingJobs} confirmed upcoming` },
    { label: 'Avg job value', value: money(avgJobValue), color: '#1a1a1a', sub: '' },
    { label: 'Total + pipeline', value: money(totalEarned + totalPipeline), color: '#22C55E', sub: '' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em' }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Where bookings come from</div>
          {sources.map(([name, count, revenue]) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize' }}>{name} <span style={{ fontWeight: 400, color: 'rgba(0,0,0,.4)' }}>· {count} jobs</span></span>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{money(revenue)}</span>
              </div>
              <div style={{ height: 6, background: '#F0F0F2', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#f97316', width: `${Math.round((revenue / maxSrc) * 100)}%`, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Revenue by work day</div>
          {byDate.map((d) => (
            <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,.045)' }}>
              <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)' }}>{d.date}</span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>{d.jobs} jobs</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{money(d.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
