'use client';
// Redesigned "Waitlist" view. Real data: GET/POST /api/admin/waitlist.

import { useState, useEffect } from 'react';
import { badgeStyle, LOAD_LABELS } from '@/lib/adminUiHelpers';

export default function WaitlistView({ flash }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/waitlist');
        if (!res.ok) return;
        const { waitlist } = await res.json();
        if (cancelled || !Array.isArray(waitlist)) return;
        const mapped = waitlist.map((w) => ({
          id: w.id,
          name: w.name || 'Unknown',
          phone: w.phone || '',
          address: w.address || '',
          dayType: w.preferred_day_type || 'any',
          preferredDate: w.preferred_date ? w.preferred_date.slice(0, 10) : null,
          preferredTime: w.preferred_time || null,
          load: w.load_size || 'quarter',
          joined: w.created_at ? w.created_at.slice(0, 10) : '',
          notified: !!w.notified,
        }));
        setList(mapped);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const notify = async (id) => {
    const entry = list.find((w) => w.id === id);
    if (!entry) return;
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, phone: entry.phone, name: entry.name }),
      });
      if (res.ok) {
        setList((l) => l.map((w) => (w.id === id ? { ...w, notified: true } : w)));
        flash?.(`Notified ${entry.name} of an open slot`);
      } else {
        const { error } = await res.json().catch(() => ({}));
        flash?.(error || 'Failed to notify customer', '#EF4444');
      }
    } catch (e) {
      flash?.('Failed to notify customer', '#EF4444');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'rgba(0,0,0,.5)', margin: 0 }}>{list.length} people waiting for an open slot</p>
      {list.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(0,0,0,.4)' }}>Waitlist is empty</div>
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.3)', marginTop: 4 }}>Customers join here when no slots are available.</div>
        </div>
      ) : list.map((w) => (
        <div key={w.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{w.name}</span>
              <span style={badgeStyle('rgba(0,0,0,.05)', 'rgba(0,0,0,.5)')}>{w.dayType[0].toUpperCase() + w.dayType.slice(1)}</span>
              <span style={badgeStyle('rgba(59,130,246,.1)', '#3B82F6')}>{LOAD_LABELS[w.load]}</span>
              {w.notified && <span style={badgeStyle('rgba(34,197,94,.1)', '#22C55E')}>Notified</span>}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)', marginTop: 2 }}>
              <a href={`tel:${w.phone}`} style={{ color: '#f97316' }}>{w.phone}</a> · {w.address} · Wants {w.preferredDate || 'any date'}{w.preferredTime ? ` at ${w.preferredTime}` : ''} · Joined {w.joined}
            </div>
          </div>
          <button
            onClick={() => notify(w.id)}
            disabled={w.notified}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: w.notified ? 'default' : 'pointer', whiteSpace: 'nowrap', background: w.notified ? 'rgba(0,0,0,.05)' : '#f97316', color: w.notified ? 'rgba(0,0,0,.3)' : '#fff' }}
          >
            {w.notified ? 'Notified' : 'Notify'}
          </button>
        </div>
      ))}
    </div>
  );
}
