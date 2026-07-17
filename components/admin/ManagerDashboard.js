'use client';

import { useCallback, useEffect, useState } from 'react';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [checklist, setChecklist] = useState({ crew_confirmed: false, trucks_confirmed: false, customer_issues_reviewed: false, failed_messages_reviewed: false, closeout_notes_added: false });
  const [notes, setNotes] = useState('');
  const load = useCallback(() => fetch('/api/admin/manager-dashboard').then((r) => r.ok ? r.json() : null).then((json) => {
    setData(json);
    if (json?.closeout?.checklist) setChecklist((current) => ({ ...current, ...json.closeout.checklist }));
    if (json?.closeout?.notes) setNotes(json.closeout.notes);
  }), []);
  useEffect(() => { load(); }, [load]);
  const saveCloseout = async (submit = false) => {
    const res = await fetch('/api/admin/manager-dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist, notes, submit, reason: submit ? 'Daily manager closeout submitted' : 'Daily manager closeout saved' }),
    });
    if (res.ok) await load();
  };
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
      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Daily closeout</div>
        {Object.keys(checklist).map((key) => (
          <label key={key} style={{ display: 'block', padding: '6px 0', fontSize: 13 }}>
            <input type="checkbox" checked={!!checklist[key]} onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })} /> {key.replaceAll('_', ' ')}
          </label>
        ))}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resolution notes / handoff notes" style={{ width: '100%', minHeight: 80, marginTop: 8, border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, padding: 10 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => saveCloseout(false)} style={button}>Save draft</button>
          <button onClick={() => saveCloseout(true)} style={{ ...button, background: '#1a1a1a', color: '#fff' }}>Submit closeout</button>
        </div>
        {data.closeout && <div style={{ marginTop: 8, color: 'rgba(0,0,0,.5)', fontSize: 12 }}>Current closeout status: {data.closeout.status}</div>}
      </div>
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
const button = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 9, background: '#fff', padding: '8px 11px', fontWeight: 800, cursor: 'pointer' };
