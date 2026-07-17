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
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id) => {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/leads/${id}`);
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDetail(d);
    else flash?.(d.error || 'Could not load lead', '#EF4444');
    setDetailLoading(false);
  };

  const leadAction = async (action, payload = {}) => {
    if (!detail?.lead?.id) return;
    const reason = ['add_note','send_follow_up','request_photos'].includes(action) ? null : window.prompt('Reason required for audit/timeline:');
    if (reason === '') return;
    const res = await fetch(`/api/admin/leads/${detail.lead.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, payload }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      flash?.('Lead action saved');
      await openDetail(detail.lead.id);
    } else {
      flash?.(d.error || 'Lead action failed', '#EF4444');
    }
  };

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
              <tr key={l.id} onDoubleClick={() => openDetail(l.id)} style={{ borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer' }}>
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
      {(detail || detailLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.18)', zIndex: 30, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'min(720px,100%)', height: '100%', background: '#fff', boxShadow: '-12px 0 32px rgba(0,0,0,.16)', overflow: 'auto', padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Lead Detail</div>
              <button onClick={() => setDetail(null)} style={smallBtn}>Close</button>
            </div>
            {detailLoading ? <div style={{ padding: 30 }}>Loading…</div> : (
              <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
                <Section title="Identity">
                  <p>{detail.lead.name || 'Unknown'} · {detail.lead.phone} · {detail.lead.email || 'no email'}</p>
                  <p>Normalized {detail.lead.normalized_phone || '—'} · session {detail.lead.session_id || detail.lead.booking_session_id || '—'}</p>
                </Section>
                <Section title="Attribution">
                  {(detail.attribution || []).map((a) => <p key={a.id}>{a.touch_type}: {a.channel}/{a.source} · {a.tracking_code || a.utm_campaign || '—'} · {a.campaign?.name || '—'}</p>)}
                  {(detail.attribution || []).length === 0 && <p>No attribution records.</p>}
                </Section>
                <Section title="Funnel and abandonment">
                  <p>Current step {detail.lead.current_step || detail.lead.last_step_reached || '—'} · abandonment {detail.lead.abandonment_point || '—'}</p>
                  <p>Quote revealed {detail.lead.quote_revealed_at || '—'} · last activity {detail.lead.last_activity_at || detail.lead.updated_at || '—'}</p>
                </Section>
                <Section title="Photos and quote history">
                  <p>Lead photos {(detail.lead.photos || []).length}</p>
                  {(detail.lead.quotes || []).map((q) => <p key={q.id}>{q.created_at}: {q.load_size} · {money(q.price)}</p>)}
                </Section>
                <Section title="Communications">
                  {(detail.messages || []).map((m) => <p key={m.id}>{m.direction} {m.message_type}: {m.provider_status} · {m.failure_reason || ''}</p>)}
                </Section>
                <Section title="Related records">
                  <p>Bookings {(detail.bookings || []).map((b) => b.booking_ref).join(', ') || '—'}</p>
                  <p>Donation requests {(detail.donations || []).length} · waitlist {(detail.waitlist || []).length} · calls {(detail.calls || []).length}</p>
                </Section>
                <Section title="Timeline">
                  {(detail.timeline || []).map((t) => <p key={t.id}>{new Date(t.created_at).toLocaleString()} · {t.event_type}</p>)}
                </Section>
                <Section title="Actions">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => leadAction('add_note', { note: window.prompt('Internal note:') || '' })} style={smallBtn}>Add note</button>
                    <button onClick={() => leadAction('send_follow_up')} style={smallBtn}>Send follow-up</button>
                    <button onClick={() => leadAction('request_photos')} style={smallBtn}>Request photos</button>
                    <button onClick={() => leadAction('correct_attribution', { customer_reported_source: window.prompt('Customer-reported source:') || '' })} style={smallBtn}>Correct attribution</button>
                    <button onClick={() => leadAction('mark_invalid')} style={smallBtn}>Mark invalid/spam</button>
                    <button onClick={() => leadAction('escalate')} style={smallBtn}>Escalate</button>
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, padding: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div><div style={{ fontSize: 13, color: 'rgba(0,0,0,.65)' }}>{children}</div></div>;
}

const smallBtn = { border: '1px solid rgba(0,0,0,.12)', borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
