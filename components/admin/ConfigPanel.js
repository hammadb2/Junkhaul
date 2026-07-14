'use client';
// Redesigned Config view — REPLACES components/admin/ConfigPanel.js.
// Real data: GET/POST /api/admin/config.

import { useState, useEffect } from 'react';

const CATEGORIES = [
  { key: 'kill_switch', label: 'Kill switches', items: [
    { key: 'kill_switch_bookings', label: 'Bookings enabled', type: 'toggle', default: true },
    { key: 'kill_switch_sms', label: 'SMS sending enabled', type: 'toggle', default: true },
  ]},
  { key: 'pricing', label: 'Pricing', items: [
    { key: 'price_single', label: 'Single item price', type: 'text', default: '99' },
    { key: 'price_quarter', label: 'Quarter load price', type: 'text', default: '160' },
    { key: 'price_half', label: 'Half load price', type: 'text', default: '240' },
    { key: 'price_full', label: 'Full load price', type: 'text', default: '380' },
  ]},
  { key: 'surge', label: 'Surge pricing', items: [
    { key: 'surge_enabled', label: 'Surge pricing enabled', type: 'toggle', default: true },
    { key: 'surge_cap', label: 'Max surge multiplier', type: 'text', default: '1.5' },
  ]},
];

export default function ConfigPanel({ flash }) {
  const [edits, setEdits] = useState({});
  const [configMap, setConfigMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/config');
        if (!res.ok) return;
        const { config } = await res.json();
        if (cancelled || !Array.isArray(config)) return;
        const map = {};
        for (const c of config) {
          map[c.key] = c.value_type === 'boolean' ? c.value === 'true' : c.value;
        }
        setConfigMap(map);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const toggle = (key, current) => setEdits((e) => ({ ...e, [key]: !current }));
  const setText = (key) => (ev) => setEdits((e) => ({ ...e, [key]: ev.target.value }));
  const save = async () => {
    const updates = Object.entries(edits).map(([key, value]) => {
      const cat = CATEGORIES.find((c) => c.items.some((it) => it.key === key));
      const item = cat?.items.find((it) => it.key === key);
      return {
        key,
        value: String(value),
        value_type: item?.type === 'toggle' ? 'boolean' : 'string',
        category: cat?.key || 'general',
      };
    });
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, updated_by: 'admin-ui' }),
      });
      if (res.ok) {
        setEdits({});
        flash?.('Config saved — changes take effect immediately');
      } else {
        const { error } = await res.json().catch(() => ({}));
        flash?.(error || 'Failed to save config', '#EF4444');
      }
    } catch (e) {
      flash?.('Failed to save config', '#EF4444');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.keys(edits).length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', borderRadius: 12, padding: '12px 16px' }}>
          <span style={{ fontSize: 12.5, color: '#c2410c', fontWeight: 500 }}>You have unsaved changes.</span>
          <button onClick={save} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#f97316', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Save changes</button>
        </div>
      )}
      {CATEGORIES.map((cat) => (
        <div key={cat.key} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>{cat.label}</div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {cat.items.map((it) => {
              const val = edits[it.key] !== undefined ? edits[it.key] : (configMap[it.key] !== undefined ? configMap[it.key] : it.default);
              return (
                <div key={it.key}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(0,0,0,.7)', marginBottom: 6 }}>{it.label}</div>
                  {it.type === 'toggle' ? (
                    <button onClick={() => toggle(it.key, val)} style={{ background: val ? '#f97316' : 'rgba(0,0,0,.15)', width: 44, height: 25, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative' }}>
                      <span style={{ position: 'absolute', top: 2, left: val ? 21 : 2, width: 21, height: 21, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </button>
                  ) : (
                    <input value={val} onChange={setText(it.key)} style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,.1)', fontSize: 12.5, outline: 'none' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
