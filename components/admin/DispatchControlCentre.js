'use client';

import { useEffect, useState } from 'react';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

const riskColor = { low: '#22C55E', medium: '#F59E0B', high: '#EF4444' };
const severityColor = { low: '#22C55E', medium: '#F59E0B', high: '#EF4444' };

export default function DispatchControlCentre({ date, flash }) {
  const [summary, setSummary] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchSummary = async () => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dispatch/control?date=${encodeURIComponent(date)}`);
      const data = await res.json();
      if (res.ok) {
        setSummary({ ...(data.totals || {}), route_plan_id: data.route_plan?.id });
        setExceptions(data.exceptions || []);
      } else {
        flash?.(data.error || 'Failed to load dispatch summary', '#EF4444');
      }
    } catch (e) {
      flash?.('Failed to load dispatch summary', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [date]);

  const publish = async () => {
    if (!summary?.route_plan_id) {
      flash?.('No route plan to publish', '#EF4444');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/dispatch/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', route_plan_id: summary.route_plan_id, published_by: null, reason: 'Approved by dispatch control centre' }),
      });
      if (res.ok) {
        flash?.('Route published');
        fetchSummary();
      } else {
        const data = await res.json();
        flash?.(data.error || 'Publish failed', '#EF4444');
      }
    } catch (e) {
      flash?.('Publish failed', '#EF4444');
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !summary) return <p style={{ padding: 16 }}>Loading dispatch summary…</p>;
  if (!summary) return null;

  const totalCards = [
    { label: 'Jobs', value: summary.jobs, color: '#1a1a1a' },
    { label: 'Revenue', value: money(summary.revenue_cents || 0), color: '#22C55E' },
    { label: 'Direct cost', value: summary.direct_cost_cents === null ? '—' : money(summary.direct_cost_cents), color: '#EF4444' },
    { label: 'Contribution', value: summary.contribution_cents === null ? '—' : money(summary.contribution_cents), color: '#3B82F6' },
    { label: 'Margin', value: summary.margin_percent === null ? '—' : `${Math.round(summary.margin_percent)}%`, color: '#1a1a1a' },
    { label: 'Total km', value: summary.total_km ?? '—', color: '#1a1a1a' },
    { label: 'Labor hrs', value: summary.labor_hours ? summary.labor_hours.toFixed(1) : '—', color: '#1a1a1a' },
    { label: 'Peak vol', value: `${Math.round(summary.peak_volume_pct || 0)}%`, color: riskColor[summary.risk_level] || '#1a1a1a' },
  ];

  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 16, color: '#1a1a1a' }}>Dispatch Control Centre — {date}</h2>
        <button onClick={publish} disabled={publishing || exceptions.some((e) => e.severity === 'high')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {publishing ? 'Publishing…' : 'Publish route'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {totalCards.map((c) => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '14px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,.42)', fontWeight: 500, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {exceptions.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(239,68,68,.2)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,.04)', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
            Exceptions ({exceptions.length})
          </div>
          {exceptions.map((e, i) => (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...badgeStyle(`${severityColor[e.severity]}15`, severityColor[e.severity]) }}>{e.severity}</span>
              <span style={{ fontSize: 12.5, color: '#1a1a1a' }}>{e.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
