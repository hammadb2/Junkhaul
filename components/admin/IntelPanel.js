'use client';
// Redesigned Intel view — REPLACES components/admin/IntelPanel.js.
// Real data: GET /api/admin/quadrant-profit?days=N&summary=true.

import { useState, useEffect } from 'react';
import { money } from '@/lib/adminUiHelpers';

export default function IntelPanel() {
  const [days, setDays] = useState(30);
  const [quadrants, setQuadrants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/quadrant-profit?days=${days}&summary=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const summary = data.summary || data.quadrants || data;
        if (Array.isArray(summary)) {
          setQuadrants(summary.map((q) => ({
            name: q.quadrant || q.name,
            jobs: q.total_jobs || q.jobs || 0,
            revenue: q.total_revenue || q.revenue || 0,
            profit: q.total_profit || q.profit || 0,
          })));
        }
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [days]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (quadrants.length === 0) return <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No quadrant data available</div>;

  const maxRev = Math.max(...quadrants.map((q) => q.revenue));
  const maxProfit = Math.max(...quadrants.map((q) => q.profit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 4, background: '#F0F0F2', borderRadius: 999, padding: 4 }}>
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: days === n ? '#f97316' : 'transparent', color: days === n ? '#fff' : 'rgba(0,0,0,.55)' }}>{n}d</button>
          ))}
        </div>
      </div>
      <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {quadrants.map((q) => (
          <div key={q.name} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{q.name}</span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>{q.jobs} jobs</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span style={{ color: 'rgba(0,0,0,.5)' }}>Revenue</span><span style={{ fontWeight: 700, color: '#1a1a1a' }}>{money(q.revenue)}</span></div>
              <div style={{ height: 6, background: '#F0F0F2', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', background: '#f97316', width: `${Math.round((q.revenue / maxRev) * 100)}%`, borderRadius: 999 }} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span style={{ color: 'rgba(0,0,0,.5)' }}>Profit</span><span style={{ fontWeight: 700, color: '#1a1a1a' }}>{money(q.profit)}</span></div>
              <div style={{ height: 6, background: '#F0F0F2', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', background: '#22C55E', width: `${Math.round((q.profit / maxProfit) * 100)}%`, borderRadius: 999 }} /></div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
              Avg margin <strong style={{ color: '#1a1a1a' }}>{q.revenue > 0 ? Math.round((q.profit / q.revenue) * 100) : 0}%</strong> · Avg job <strong style={{ color: '#1a1a1a' }}>{money(q.jobs > 0 ? Math.round(q.revenue / q.jobs) : 0)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
