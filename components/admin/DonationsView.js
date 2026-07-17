'use client';

import { useEffect, useState } from 'react';

export default function DonationsView({ flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => fetch('/api/admin/donations').then((r) => r.ok ? r.json() : { donations: [] }).then((d) => setRows(d.donations || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = async (id, action) => {
    const reason = window.prompt('Reason required for audit/timeline:');
    if (!reason) return;
    const res = await fetch('/api/admin/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donation_request_id: id, action, reason }),
    });
    if (res.ok) {
      flash?.('Donation action saved');
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash?.(d.error || 'Donation action failed', '#EF4444');
    }
  };
  if (loading) return <div style={{ padding: 40, color: 'rgba(0,0,0,.45)' }}>Loading donations…</div>;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Donation requests</div>
        <div style={{ color: 'rgba(0,0,0,.5)', fontSize: 13, marginTop: 4 }}>
          Shows customer, address, attribution-ready source fields, photos, AI outcome, route-fit status, Quo context, reviewer status and final outcome. Free pickup still requires item approval plus route-fit approval.
        </div>
      </div>
      {rows.map((d) => (
        <div key={d.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{d.request_ref} · {d.name || 'Unknown'} · {d.phone}</div>
              <div style={{ color: 'rgba(0,0,0,.55)', fontSize: 13 }}>{d.address}{d.unit ? ` #${d.unit}` : ''}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>{d.description}</div>
              <div style={{ marginTop: 8, color: 'rgba(0,0,0,.55)', fontSize: 12 }}>AI: {d.ai_outcome || 'pending'} · confidence {d.confidence ?? '—'} · photos {d.photos?.length || 0}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', borderRadius: 999, padding: '4px 10px', background: '#F0F0F2', fontWeight: 700, fontSize: 12 }}>{d.status}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={() => act(d.id, 'approve')} style={btn}>Approve</button>
                <button onClick={() => act(d.id, 'request_photos')} style={btn}>Request photos</button>
                <button onClick={() => act(d.id, 'reject')} style={btn}>Reject</button>
                <button onClick={() => act(d.id, 'convert_to_paid')} style={btn}>Paid quote</button>
                <button onClick={() => act(d.id, 'match_route')} style={btn}>Match route</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div style={{ background: '#fff', borderRadius: 14, padding: 28, color: 'rgba(0,0,0,.45)' }}>No donation requests yet.</div>}
    </div>
  );
}

const btn = { border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
