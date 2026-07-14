'use client';
// Redesigned Calls view — REPLACES components/admin/CallsPanel.js.
// Real data: GET /api/admin/call-history.

import { useState, useEffect } from 'react';
import { badgeStyle } from '@/lib/adminUiHelpers';

const SENT_BADGE = {
  frustrated: badgeStyle('rgba(239,68,68,.12)', '#EF4444'),
  negative: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
  neutral: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.5)'),
  positive: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
};

export default function CallsPanel() {
  const [calls, setCalls] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/call-history');
        if (!res.ok) return;
        const { calls: data } = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((c) => ({
          id: c.id,
          name: c.caller_name || c.name || 'Unknown',
          phone: c.caller_number || c.phone || '',
          sentiment: c.sentiment || 'neutral',
          summary: c.summary || c.transcript || '',
          date: c.call_date ? new Date(c.call_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ', ' + new Date(c.call_date).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : '',
        }));
        setCalls(mapped);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (calls.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No calls recorded</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', margin: 0 }}>Sorted by sentiment risk — frustrated and negative calls surface first.</p>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            {['Sentiment', 'Caller', 'Summary', 'Date'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id} onClick={() => setSelected(c)} style={{ borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer' }}>
                <td style={{ padding: '11px 18px' }}><span style={SENT_BADGE[c.sentiment]}>{c.sentiment}</span></td>
                <td style={{ padding: '11px 12px' }}><div style={{ fontWeight: 600, color: '#1a1a1a' }}>{c.name}</div><div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', fontFamily: 'monospace' }}>{c.phone}</div></td>
                <td style={{ padding: '11px 12px', color: 'rgba(0,0,0,.55)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary}</td>
                <td style={{ padding: '11px 18px', color: 'rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Call detail</div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: 'rgba(0,0,0,.35)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong style={{ color: '#1a1a1a' }}>Caller:</strong> {selected.name} · <span style={{ fontFamily: 'monospace' }}>{selected.phone}</span></div>
              <div><strong style={{ color: '#1a1a1a' }}>Sentiment:</strong> <span style={SENT_BADGE[selected.sentiment]}>{selected.sentiment}</span></div>
              <div style={{ marginTop: 6 }}><strong style={{ color: '#1a1a1a' }}>Summary</strong></div>
              <div style={{ background: '#FAFAFA', borderRadius: 10, padding: 12, fontSize: 12.5, lineHeight: 1.5 }}>{selected.summary}</div>
            </div>
            <button onClick={() => window.open(`tel:${selected.phone}`)} style={{ marginTop: 16, width: '100%', padding: '11px 0', border: 'none', borderRadius: 10, background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📞 Call back</button>
          </div>
        </div>
      )}
    </div>
  );
}
