'use client';
// Redesigned "Leads" view — quoted-but-not-booked funnel.
// Real data: GET /api/admin/leads.

import { useState, useEffect } from 'react';
import { money, badgeStyle, sortRows, LOAD_LABELS } from '@/lib/adminUiHelpers';

const STATUS_BADGE = {
  quoted: badgeStyle('rgba(59,130,246,.1)', '#3B82F6'),
  engaged: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
  converted: badgeStyle('rgba(34,197,94,.1)', '#22C55E'),
  expired: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.4)'),
};
const TABS = ['all', 'quoted', 'engaged', 'converted', 'expired'];

export default function LeadsView({ flash }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('quoted');
  const [dir, setDir] = useState('desc');
  const [selected, setSelected] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/leads');
        if (!res.ok) return;
        const { leads: data } = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((l) => {
          const latestQuote = (l.quotes && l.quotes[0]) || {};
          const ageHours = l.created_at ? Math.round((Date.now() - new Date(l.created_at).getTime()) / 3600000) : 0;
          let lastTouch = 'T+1hr';
          if (l.converted_to_booking_id) lastTouch = 'Booked';
          else if (l.final_reminder_sent) lastTouch = 'T+47hr';
          else if (l.abandonment_sms_sent) lastTouch = 'T+20hr';
          else if (l.follow_up_sent) lastTouch = 'T+1hr';
          let leadStatus = 'quoted';
          if (l.converted_to_booking_id) leadStatus = 'converted';
          else if (l.final_reminder_sent) leadStatus = 'expired';
          else if (l.follow_up_sent || l.abandonment_sms_sent) leadStatus = 'engaged';
          return {
            id: l.id,
            name: l.name || 'Unknown',
            phone: l.phone || '',
            quoted: l.created_at ? l.created_at.slice(0, 10) : '',
            load: latestQuote.load_size || 'quarter',
            price: latestQuote.price || 0,
            status: leadStatus,
            lastTouch,
          };
        });
        setLeads(mapped);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const toggleSort = (key) => setSort((prevSort) => { setDir(prevSort === key && dir === 'desc' ? 'asc' : 'desc'); return key; });
  const toggleRow = (id) => setSelected((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = true; return n; });

  let rows = leads.filter((l) =>
    (status === 'all' || l.status === status) &&
    (search === '' || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))
  );
  rows = sortRows(rows, sort, dir);
  const ids = rows.map((l) => l.id);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = ids.length > 0 && ids.every((id) => selected[id]);

  const sortIcon = (key) => (sort === key ? (dir === 'desc' ? '↓' : '↑') : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {selectedCount > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a1a', borderRadius: 12, padding: '10px 16px' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedCount} selected</span>
          <button onClick={async () => {
            const selectedIds = Object.keys(selected).filter((k) => selected[k]);
            if (selectedIds.length === 0) {
              flash?.('Select leads first', '#F59E0B');
              return;
            }
            try {
              const res = await fetch('/api/admin/leads/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  leads: selectedIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean),
                }),
              });
              if (res.ok) {
                flash?.(`Follow-up SMS sent to ${selectedIds.length} lead(s)`);
                setSelected({});
                // Refresh leads
                const leadsRes = await fetch('/api/admin/leads');
                if (leadsRes.ok) {
                  const data = await leadsRes.json();
                  setLeads(data.leads || []);
                }
              } else {
                flash?.('Failed to send SMS', '#EF4444');
              }
            } catch (e) {
              flash?.('Failed to send SMS', '#EF4444');
            }
          }} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Send follow-up SMS</button>
          <button onClick={() => setSelected({})} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'rgba(255,255,255,.7)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." aria-label="Search leads" style={{ flex: 1, minWidth: 200, maxWidth: 280, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', fontSize: 13, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 4, background: '#F0F0F2', borderRadius: 999, padding: 3 }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setStatus(t)} style={{ padding: '7px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: status === t ? '#f97316' : 'transparent', color: status === t ? '#fff' : 'rgba(0,0,0,.55)' }}>
                {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              <th style={{ width: 38, padding: '11px 0 11px 18px' }}>
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? {} : Object.fromEntries(ids.map((id) => [id, true])))} />
              </th>
              <th onClick={() => toggleSort('name')} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', cursor: 'pointer' }}>Name {sortIcon('name')}</th>
              <th onClick={() => toggleSort('quoted')} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', cursor: 'pointer' }}>Quoted {sortIcon('quoted')}</th>
              <th style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>Load</th>
              <th onClick={() => toggleSort('price')} style={{ textAlign: 'right', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', cursor: 'pointer' }}>Price {sortIcon('price')}</th>
              <th style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '11px 18px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>Last touch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '10px 0 10px 18px' }}><input type="checkbox" checked={!!selected[l.id]} onChange={() => toggleRow(l.id)} /></td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1a1a' }}>{l.name}<div style={{ fontSize: 11.5, fontWeight: 400, color: 'rgba(0,0,0,.4)' }}>{l.phone}</div></td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{l.quoted}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(0,0,0,.55)' }}>{LOAD_LABELS[l.load]}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1a1a1a' }}>{money(l.price)}</td>
                <td style={{ padding: '10px 12px' }}><span style={STATUS_BADGE[l.status]}>{l.status[0].toUpperCase() + l.status.slice(1)}</span></td>
                <td style={{ padding: '10px 18px', color: 'rgba(0,0,0,.42)' }}>{l.lastTouch}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(0,0,0,.4)' }}>No leads match this filter</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.3)', marginTop: 4 }}>Try a different search or status tab.</div>
          </div>
        )}
      </div>
    </div>
  );
}
