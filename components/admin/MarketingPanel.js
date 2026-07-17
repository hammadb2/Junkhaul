'use client';

import { useEffect, useState } from 'react';

const money = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`;

export default function MarketingPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/admin/marketing')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
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
