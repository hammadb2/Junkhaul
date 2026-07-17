'use client';
// Redacted audit viewer. Real data: GET /api/admin/audit-events.

import { useState, useEffect } from 'react';

const TYPES = ['All', 'sensitive_action_allowed', 'sensitive_action_denied', 'staff_access.assign_role', 'staff_access.remove_role', 'staff_access.assign_permission', 'staff_access.remove_permission', 'staff_access.assign_scope', 'staff_access.remove_scope'];
const ALLOWED_FILTERS = ['All', 'allowed', 'denied'];

export default function AuditTrail() {
  const [filter, setFilter] = useState('All');
  const [allowedFilter, setAllowedFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '300' });
        if (filter !== 'All') params.set('event_type', filter);
        if (allowedFilter !== 'All') params.set('allowed', allowedFilter);
        if (query.trim()) params.set(query.includes('-') ? 'correlation_id' : 'entity_type', query.trim());
        const res = await fetch(`/api/admin/audit-events?${params.toString()}`);
        if (!res.ok) return;
        const { events: data } = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((e) => ({
          time: e.created_at ? new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ', ' + new Date(e.created_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : '',
          type: e.event_type || e.type || 'unknown',
          ref: `${e.entity_type || 'entity'} ${String(e.entity_id || '—').slice(0, 8)}`,
          actor: `${e.actor_type || 'actor'} ${String(e.actor_id || 'anonymous').slice(0, 8)}`,
          correlation: e.correlation_id || '—',
          payload: JSON.stringify({ before: e.before, after: e.after, metadata: e.metadata, reason: e.reason }),
        }));
        setEvents(mapped);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filter, allowedFilter, query]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const rows = events.filter((e) => filter === 'All' || e.type === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by event type" style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', fontSize: 12.5 }}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={allowedFilter} onChange={(e) => setAllowedFilter(e.target.value)} aria-label="Filter allowed or denied actions" style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', fontSize: 12.5 }}>
          {ALLOWED_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="entity type or correlation ID" style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', fontSize: 12.5, minWidth: 240 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            {['Time', 'Event', 'Reference', 'Actor', 'Correlation', 'Redacted before/after'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '10px 18px', color: 'rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>{e.time}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1a1a' }}>{e.type}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{e.ref}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{e.actor}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.45)', fontFamily: 'monospace' }}>{String(e.correlation).slice(0, 12)}</td>
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
