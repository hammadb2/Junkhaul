'use client';

import { useState } from 'react';

export default function BookingDetailView() {
  const [id, setId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [action, setAction] = useState('add_internal_note');
  const [reason, setReason] = useState('');
  const [payloadText, setPayloadText] = useState('{"note":"Customer called; manager reviewed."}');
  const load = async () => {
    setError(null);
    const res = await fetch(`/api/admin/bookings/${id}/detail`);
    const d = await res.json();
    if (!res.ok) setError(d.error || 'Could not load booking');
    else setData(d);
  };
  const b = data?.booking;
  const runAction = async () => {
    setError(null);
    let payload = {};
    try { payload = payloadText ? JSON.parse(payloadText) : {}; } catch { setError('Payload must be valid JSON'); return; }
    const res = await fetch(`/api/admin/bookings/${b.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, payload }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error || 'Action failed'); return; }
    await load();
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Booking Detail workspace</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Booking UUID" style={{ flex: 1, border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: 10 }} />
          <button onClick={load} disabled={!id} style={{ border: 'none', borderRadius: 10, padding: '0 16px', background: '#f97316', color: '#fff', fontWeight: 800 }}>Open</button>
        </div>
        {error && <div style={{ color: '#EF4444', marginTop: 10 }}>{error}</div>}
      </div>
      {b && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
          <Card title="Overview">
            <p>{b.booking_ref} · {b.status}</p><p>{b.name} · {b.phone}</p><p>{b.job_date} {b.job_time}</p><p>Total ${b.total_price} · Balance ${b.balance_due}</p><p>Source {b.source}</p>
          </Card>
          <Card title="Customer and property">
            <p>{b.address}</p><p>Unit {b.unit || '—'} · Buzzer {b.buzzer || '—'}</p><p>Parking {b.parking || '—'}</p><p>Access {b.access_instructions || b.customer_notes || '—'}</p>
          </Card>
          <Card title="Photos and AI">
            <p>Photos {(b.photos || []).length}</p><p>AI load {b.ai_load_estimate || '—'} · confidence {b.ai_confidence || '—'}</p><p>Hazmat {b.has_hazmat ? b.hazmat_description || 'yes' : 'no'}</p>
          </Card>
          <Card title="Items">
            <pre style={pre}>{JSON.stringify(b.itemized_items || [], null, 2)}</pre>
          </Card>
          <Card title="Pricing ledger">
            {(data.pricing_ledger || []).map((l) => <p key={l.id}>{l.ledger_type}: ${l.total} · {l.actor_type} · {l.reason}</p>)}
          </Card>
          <Card title="Attribution">
            {(data.attribution || []).map((a) => <p key={a.id}>{a.touch_type}: {a.channel}/{a.source} · {a.tracking_code || a.utm_campaign || '—'}</p>)}
          </Card>
          <Card title="Communications">
            {(data.messages || []).map((m) => <p key={m.id}>{m.direction} {m.message_type}: {m.provider_status}</p>)}
          </Card>
          <Card title="Timeline">
            {(data.timeline || []).map((t) => <p key={t.id}>{new Date(t.created_at).toLocaleString()} · {t.event_type}</p>)}
          </Card>
          <Card title="Admin actions">
            <div style={{ display: 'grid', gap: 8 }}>
              <select value={action} onChange={(e) => setAction(e.target.value)} style={input}>
                {['add_internal_note','assign_crew','unassign_crew','assign_truck','unassign_truck','reschedule','correct_address','request_photos','send_reschedule_confirmation','send_cancellation_notice','flag_issue','escalate','cancel_without_refund','record_no_show','mark_ready_for_dispatch'].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for audit/timeline" style={input} />
              <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={5} style={{ ...input, fontFamily: 'monospace' }} />
              <button onClick={runAction} style={{ border: 'none', borderRadius: 9, padding: '9px 12px', background: '#1a1a1a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Run action</button>
              <p>Refund execution is intentionally not available here. Use owner-only refund workflows separately.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 16 }}><div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div><div style={{ fontSize: 13, color: 'rgba(0,0,0,.68)' }}>{children}</div></div>;
}
const pre = { whiteSpace: 'pre-wrap', fontSize: 11, maxHeight: 180, overflow: 'auto', background: '#FAFAFA', padding: 8, borderRadius: 8 };
const input = { width: '100%', boxSizing: 'border-box', border: '1px solid rgba(0,0,0,.12)', borderRadius: 9, padding: 9, fontSize: 13 };
