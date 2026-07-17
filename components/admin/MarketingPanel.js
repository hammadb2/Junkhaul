'use client';

import { useEffect, useState } from 'react';

const money = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`;

export default function MarketingPanel() {
  const [data, setData] = useState(null);
  const [manage, setManage] = useState(null);
  const [draft, setDraft] = useState({ type: 'campaign', name: '', channel: 'offline', source: 'door_hanger', code: '', destination_path: '/book/hanger' });
  const [loading, setLoading] = useState(true);
  const loadManage = () => fetch('/api/admin/campaigns').then((r) => r.ok ? r.json() : null).then(setManage);
  useEffect(() => {
    fetch('/api/admin/marketing')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
    loadManage();
  }, []);
  if (loading) return <div style={{ padding: 40, color: 'rgba(0,0,0,.45)' }}>Loading marketing reports…</div>;
  const reports = data?.reports || [];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Campaign reporting</div>
        <div style={{ color: 'rgba(0,0,0,.5)', fontSize: 13, marginTop: 4 }}>
          Server-side attribution, hanger batches, visits, conversions, revenue, and donation requests. Breakdown fields are stored by campaign, batch, creative, neighbourhood, distributor and date.
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Campaign and tracking-code administration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginTop: 12 }}>
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} style={input}><option value="campaign">Campaign</option><option value="batch">Batch</option><option value="tracking_code">Tracking code</option></select>
          {draft.type === 'campaign' && <>
            <input placeholder="Name" value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} />
            <input placeholder="Channel" value={draft.channel || ''} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} style={input} />
            <input placeholder="Source" value={draft.source || ''} onChange={(e) => setDraft({ ...draft, source: e.target.value })} style={input} />
          </>}
          {draft.type === 'batch' && <>
            <select value={draft.campaign_id || ''} onChange={(e) => setDraft({ ...draft, campaign_id: e.target.value })} style={input}><option value="">Campaign</option>{(manage?.campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input placeholder="Batch name/code" value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} />
            <input placeholder="Neighbourhood" value={draft.neighbourhood || ''} onChange={(e) => setDraft({ ...draft, neighbourhood: e.target.value })} style={input} />
            <input placeholder="Distributor" value={draft.distributor || ''} onChange={(e) => setDraft({ ...draft, distributor: e.target.value })} style={input} />
          </>}
          {draft.type === 'tracking_code' && <>
            <select value={draft.campaign_id || ''} onChange={(e) => setDraft({ ...draft, campaign_id: e.target.value })} style={input}><option value="">Campaign</option>{(manage?.campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={draft.batch_id || ''} onChange={(e) => setDraft({ ...draft, batch_id: e.target.value || null })} style={input}><option value="">Batch optional</option>{(manage?.batches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <input placeholder="Code e.g. DH-COV-001" value={draft.code || ''} onChange={(e) => setDraft({ ...draft, code: e.target.value })} style={input} />
            <input placeholder="Destination path" value={draft.destination_path || ''} onChange={(e) => setDraft({ ...draft, destination_path: e.target.value })} style={input} />
          </>}
          <button onClick={async () => {
            const res = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
            if (res.ok) { setDraft({ type: 'campaign', name: '', channel: 'offline', source: 'door_hanger', code: '', destination_path: '/book/hanger' }); loadManage(); }
          }} style={{ border: 'none', borderRadius: 9, padding: '9px 12px', background: '#1a1a1a', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Create</button>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {(manage?.tracking_codes || []).slice(0, 8).map((code) => (
            <div key={code.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <b>{code.code}</b><span>{code.active ? 'active' : 'inactive'}</span><code style={{ fontSize: 11 }}>{code.preview_url}</code>
              <button onClick={() => navigator.clipboard?.writeText(code.preview_url)} style={miniBtn}>Copy URL</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFAFA' }}>
              {['Campaign','Printed','Distributed','Cost','Visits','Unique','Leads','Donations','Bookings','Completed','Booked Rev','Collected Rev','CPB','ROAS'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(0,0,0,.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.campaign.id} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>{r.campaign.name}<div style={{ fontWeight: 400, color: 'rgba(0,0,0,.45)' }}>{r.campaign.source}</div></td>
                <td style={{ padding: 12 }}>{r.printed}</td>
                <td style={{ padding: 12 }}>{r.distributed}</td>
                <td style={{ padding: 12 }}>{money(r.cost_cents / 100)}</td>
                <td style={{ padding: 12 }}>{r.visits}</td>
                <td style={{ padding: 12 }}>{r.unique_visitors}</td>
                <td style={{ padding: 12 }}>{r.phone_submissions}</td>
                <td style={{ padding: 12 }}>{r.donation_requests}</td>
                <td style={{ padding: 12 }}>{r.bookings}</td>
                <td style={{ padding: 12 }}>{r.completed_jobs}</td>
                <td style={{ padding: 12 }}>${r.booked_revenue}</td>
                <td style={{ padding: 12 }}>${r.collected_revenue}</td>
                <td style={{ padding: 12 }}>{money(r.cost_per_booking)}</td>
                <td style={{ padding: 12 }}>{r.return_on_spend == null ? '—' : `${(r.return_on_spend * 100).toFixed(1)}%`}</td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={14} style={{ padding: 28, color: 'rgba(0,0,0,.45)' }}>No campaign records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const input = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 9, padding: 9, fontSize: 13 };
const miniBtn = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 8, padding: '5px 8px', background: '#fff', cursor: 'pointer', fontSize: 12 };
