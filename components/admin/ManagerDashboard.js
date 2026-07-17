'use client';

import { useEffect, useState } from 'react';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/admin/manager-dashboard').then((r) => r.ok ? r.json() : null).then(setData);
  }, []);
  if (!data) return <div style={{ padding: 40, color: 'rgba(0,0,0,.45)' }}>Loading manager operations…</div>;
  const queues = data.queues || {};
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Manager operations dashboard</div>
        <div style={{ color: 'rgba(0,0,0,.55)', fontSize: 13, marginTop: 4 }}>Operational queues use the same backend permissions as Booking Detail, donations and communications.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {Object.entries(data.counts || {}).map(([key, value]) => <div key={key} style={card}><div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)' }}>{key.replaceAll('_', ' ')}</div><div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div></div>)}
      </div>
      <Queue title="Today’s bookings" rows={queues.today_bookings} render={(b) => `${b.booking_ref} · ${b.job_time} · ${b.status} · ${b.address}`} />
      <Queue title="Unassigned bookings" rows={queues.unassigned_bookings} render={(b) => `${b.booking_ref} · ${b.job_date} ${b.job_time} · ${b.quadrant || '—'}`} />
      <Queue title="Failed Quo messages" rows={queues.failed_quo_messages} render={(m) => `${m.provider_status} · ${m.to_number || m.from_number} · ${m.failure_reason || m.message_type || 'message'}`} />
      <Queue title="Donation review" rows={queues.donation_requests_awaiting_review} render={(d) => `${d.name || 'Unknown'} · ${d.status} · ${d.address || 'no address'}`} />
      <Queue title="Incidents and escalations" rows={[...(queues.incidents || []), ...(queues.escalations || [])]} render={(r) => `${r.status || 'open'} · ${r.title || r.issue_type || r.reason || r.id}`} />
    </div>
  );
}

function Queue({ title, rows = [], render }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? <div style={{ color: 'rgba(0,0,0,.45)', fontSize: 13 }}>None.</div> : rows.slice(0, 12).map((row) => <div key={row.id} style={{ padding: '7px 0', borderTop: '1px solid rgba(0,0,0,.05)', fontSize: 13 }}>{render(row)}</div>)}
    </div>
  );
}

const card = { background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 };
