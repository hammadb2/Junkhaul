'use client';
// Redesigned Audit view — REPLACES components/admin/AuditTrail.js.
// Real data: GET /api/admin/events.

import { useState, useEffect } from 'react';

const TYPES = ['All', 'surge_applied', 'sms_outbound', 'sms_inbound', 'review_request_sent', 'abandonment_touch1_sent'];

export default function AuditTrail() {
  const [filter, setFilter] = useState('All');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/events?limit=200');
        if (!res.ok) return;
        const { events: data } = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((e) => ({
          time: e.created_at ? new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ', ' + new Date(e.created_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : '',
          type: e.event_type || e.type || 'unknown',
          ref: e.booking_id ? `Booking ${e.booking_id.slice(0, 8)}` : e.lead_id ? `Lead ${e.lead_id.slice(0, 8)}` : e.reference || '—',
          payload: e.payload ? (typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload)) : '',
        }));
        setEvents(mapped);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const rows = events.filter((e) => filter === 'All' || e.type === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by event type" style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', fontSize: 12.5 }}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            {['Time', 'Event', 'Reference', 'Payload'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '10px 18px', color: 'rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>{e.time}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1a1a' }}>{e.type}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{e.ref}</td>
                <td style={{ padding: '10px 18px', color: 'rgba(0,0,0,.4)', fontFamily: 'monospace', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.payload}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,.4)' }}>No events match this filter.</div>}
      </div>
    </div>
  );
}
