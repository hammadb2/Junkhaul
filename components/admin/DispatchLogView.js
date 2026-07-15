'use client';
import { useEffect, useState } from 'react';

const TIER_COLORS = {
  A: '#22C55E',
  B: '#F59E0B',
  C: '#EF4444',
  D: '#8B5CF6',
};

const TIER_LABELS = {
  A: 'Tier A — Auto',
  B: 'Tier B — Do + Notify',
  C: 'Tier C — Escalated',
  D: 'Tier D — Logged',
};

export default function DispatchLogView() {
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [tierFilter, setTierFilter] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ days: String(days) });
        if (tierFilter) params.set('tier', tierFilter);
        const res = await fetch(`/api/admin/dispatch-actions?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setActions(data.actions || []);
        setStats(data.stats || null);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days, tierFilter]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Dispatch Log</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(0,0,0,.5)' }}>Audit trail of all actions taken by the Dispatch AI agent</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,.1)',
                background: days === d ? '#f97316' : '#fff', color: days === d ? '#fff' : '#1a1a1a',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >{d === 1 ? 'Today' : `${d}d`}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {['A', 'B', 'C', 'D'].map(t => (
            <div key={t} style={{
              flex: 1, borderRadius: 14, border: '1px solid rgba(0,0,0,.06)',
              padding: '14px 16px', background: '#fff',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TIER_COLORS[t], textTransform: 'uppercase', letterSpacing: .5 }}>
                {TIER_LABELS[t]}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginTop: 4 }}>
                {stats[`tier${t}`] || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTierFilter(null)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)',
            background: !tierFilter ? '#1a1a1a' : '#fff', color: !tierFilter ? '#fff' : '#666',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >All</button>
        {['A', 'B', 'C', 'D'].map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid ${TIER_COLORS[t]}33`,
              background: tierFilter === t ? TIER_COLORS[t] : '#fff', color: tierFilter === t ? '#fff' : TIER_COLORS[t],
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >Tier {t}</button>
        ))}
      </div>

      {/* Actions list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 14 }}>Loading...</div>
      ) : actions.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 14,
          borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', background: '#fff',
        }}>
          No dispatch actions in this period. The Dispatch agent hasnt been activated yet — set <code style={{ fontSize: 12, background: '#f4f4f5', padding: '2px 6px', borderRadius: 4 }}>VAPI_DISPATCH_AGENT_ID</code> in your environment to enable it.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map(a => (
            <div key={a.id} style={{
              borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', background: '#fff',
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: TIER_COLORS[a.tier],
                marginTop: 6, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{a.action}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: TIER_COLORS[a.tier], textTransform: 'uppercase',
                    padding: '1px 6px', borderRadius: 4, background: `${TIER_COLORS[a.tier]}15`,
                  }}>{a.tier}</span>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,.4)' }}>
                    {new Date(a.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {a.details && (
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', lineHeight: 1.5, marginBottom: 4 }}>
                    {a.details}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'rgba(0,0,0,.4)' }}>
                  {a.employee_name && <span>Crew: {a.employee_name}</span>}
                  {a.caller_phone && <span>From: {a.caller_phone}</span>}
                  {a.booking_id && <span>Booking: {a.booking_id.slice(0, 8)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
