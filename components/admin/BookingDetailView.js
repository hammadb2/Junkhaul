'use client';

import { useState } from 'react';

export default function BookingDetailView() {
  const [id, setId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = async () => {
    setError(null);
    const res = await fetch(`/api/admin/bookings/${id}/detail`);
    const d = await res.json();
    if (!res.ok) setError(d.error || 'Could not load booking');
    else setData(d);
  };
  const b = data?.booking;
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
            <p>Action APIs will require permission + audit/timeline records. Current foundation supports assign crew/truck, reschedule, address correction, quote review, notes, SMS, payment link, photo request, attribution correction, flags, cancel, escalate.</p>
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
