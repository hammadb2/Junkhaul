'use client';

import { useCallback, useEffect, useState } from 'react';

export default function CommunicationsPanel({ flash }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const load = useCallback(() => fetch(`/api/admin/communications${status ? `?status=${encodeURIComponent(status)}` : ''}`).then((r) => r.ok ? r.json() : null).then(setData), [status]);
  useEffect(() => { load(); }, [load]);
  const retry = async (message) => {
    const reason = window.prompt('Reason for retry:');
    if (!reason) return;
    const res = await fetch('/api/admin/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry_failed_message', message_id: message.id, reason }),
    });
    const d = await res.json().catch(() => ({}));
    flash?.(res.ok ? 'Retry attempted' : d.error || 'Retry failed', res.ok ? '#22C55E' : '#EF4444');
    load();
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Communications</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 4 }}>Quo inbound/outbound, failed/suppressed messages, STOP state, expected replies and safe retry controls.</div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginTop: 12, border: '1px solid rgba(0,0,0,.12)', borderRadius: 9, padding: 8 }}>
          <option value="">All statuses</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
          <option value="suppressed">Suppressed</option>
          <option value="delivered">Delivered</option>
          <option value="queued">Queued</option>
        </select>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Active STOP suppressions</div>
        {(data?.active_suppressions || []).slice(0, 10).map((s) => <p key={s.normalized_phone} style={row}>{s.normalized_phone} · {s.reason}</p>)}
        {(data?.active_suppressions || []).length === 0 && <p style={muted}>No active suppressions.</p>}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Expected replies</div>
        {(data?.active_expected_replies || []).slice(0, 10).map((r) => <p key={r.id} style={row}>{r.normalized_phone} · {r.entity_type}:{r.entity_id} · {r.expected_intent} · expires {r.expires_at}</p>)}
        {(data?.active_expected_replies || []).length === 0 && <p style={muted}>No active expected replies.</p>}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Messages</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {(data?.messages || []).map((m) => (
            <div key={m.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <b>{m.direction} · {m.message_type || 'message'} · {m.provider_status || 'unknown'}</b>
                {['failed','rejected','suppressed'].includes(m.provider_status) && <button onClick={() => retry(m)} style={btn}>Retry safely</button>}
              </div>
              <div style={muted}>{m.to_number || m.from_number} · {m.failure_reason || ''}</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>{m.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const card = { background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 };
const row = { fontSize: 13, margin: '6px 0', color: 'rgba(0,0,0,.68)' };
const muted = { fontSize: 13, color: 'rgba(0,0,0,.45)' };
const btn = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 8, padding: '6px 9px', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
