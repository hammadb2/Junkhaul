'use client';
// Redesigned Growth view — REPLACES components/admin/GrowthPanel.js.
// Real data: GET /api/admin/growth.

import { useState, useEffect } from 'react';

const FUNNEL_LABELS = { quoted: 'Quoted', touch1: 'T+1hr', touch2: 'T+20hr', touch3: 'T+47hr', converted: 'Booked' };

export default function GrowthPanel() {
  const [funnel, setFunnel] = useState({ quoted: 0, touch1: 0, touch2: 0, touch3: 0, converted: 0 });
  const [offers, setOffers] = useState([]);
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/growth');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.funnel) {
          setFunnel({
            quoted: data.funnel.quoted || 0,
            touch1: data.funnel.touch1 || 0,
            touch2: data.funnel.touch2 || 0,
            touch3: data.funnel.touch3 || 0,
            converted: data.funnel.converted || 0,
          });
        }

        if (Array.isArray(data.offers)) {
          setOffers(data.offers.slice(0, 20).map((o) => ({
            phone: o.phone || o.customer_phone || '—',
            type: o.offer_type || o.type || '—',
            original: o.original_price || o.list_price || 0,
            discounted: o.offer_price || o.discounted_price || 0,
          })));
        }

        if (Array.isArray(data.cronHealth)) {
          setCrons(data.cronHealth.map((c) => ({
            name: c.job_name || c.name || '—',
            status: c.last_status || c.status || 'unknown',
          })));
        }
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (funnel.quoted === 0 && offers.length === 0 && crons.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No growth data available</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Abandonment funnel</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {Object.keys(funnel).map((k) => (
            <div key={k} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 8, background: 'rgba(249,115,22,.12)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#f97316', width: `${Math.round((funnel[k] / funnel.quoted) * 100)}%`, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginTop: 8, fontWeight: 500 }}>{FUNNEL_LABELS[k]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{funnel[k]}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Opportunistic offers</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            {['Phone', 'Type', 'Original', 'Discounted', 'Off %'].map((h, i) => (
              <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left', padding: i === 0 ? '10px 18px' : i === 4 ? '10px 18px' : '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.phone} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '10px 18px', fontFamily: 'monospace', color: 'rgba(0,0,0,.6)' }}>{o.phone}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{o.type}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(0,0,0,.4)', textDecoration: 'line-through' }}>${o.original}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1a1a1a' }}>${o.discounted}</td>
                <td style={{ padding: '10px 18px', textAlign: 'right', color: '#f97316', fontWeight: 600 }}>{Math.round((1 - o.discounted / o.original) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Cron health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {crons.map((j) => (
            <div key={j.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{j.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: j.status === 'finished' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: j.status === 'finished' ? '#22C55E' : '#EF4444' }}>{j.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
