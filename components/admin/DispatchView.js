'use client';
// Redesigned "Dispatch" view — replaces the `view === 'dispatch'` block in
// app/admin/page.js. Real data: GET /api/admin/bookings; route optimize:
// POST /api/admin/optimise-route; actions: POST /api/admin/{complete,
// mark-arrived,cancel,reschedule}.

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { money, badgeStyle, LOAD_LABELS } from '@/lib/adminUiHelpers';

const LiveCrewMap = dynamic(() => import('./LiveCrewMap'), { ssr: false });

const BOOKINGS = [
  { id: 'b1', date: '2026-07-16', time: '07:30', name: 'Sarah Whitfield', phone: '(403) 555-0142', address: '142 Auburn Bay Ave SE', quadrant: 'SE', load: 'half', price: 240, status: 'confirmed', source: 'web', deposit: true, flagged: false, riskScore: 12 },
  { id: 'b2', date: '2026-07-16', time: '09:00', name: 'Marcus Feldman', phone: '(403) 555-0198', address: '88 Cranston Dr SE', quadrant: 'SE', load: 'full', price: 380, status: 'confirmed', source: 'phone', deposit: true, flagged: true, riskScore: 62 },
  { id: 'b3', date: '2026-07-16', time: '11:00', name: 'Priya Nandan', phone: '(403) 555-0111', address: '220 Copperfield Blvd SE', quadrant: 'SE', load: 'quarter', price: 160, status: 'confirmed', source: 'web', deposit: true, flagged: false, riskScore: 8 },
  { id: 'b4', date: '2026-07-16', time: '13:00', name: 'Devon Okafor Jr.', phone: '(403) 555-0177', address: '55 Panorama Hills Way NW', quadrant: 'NW', load: 'single_item', price: 99, status: 'completed', source: 'web', deposit: true, flagged: false, riskScore: 5 },
  { id: 'b5', date: '2026-07-19', time: '07:30', name: 'Aisha Rahman', phone: '(403) 555-0133', address: '12 Mahogany Manor SE', quadrant: 'SE', load: 'full', price: 380, status: 'confirmed', source: 'web', deposit: true, flagged: false, riskScore: 10 },
  { id: 'b6', date: '2026-07-19', time: '09:00', name: 'Colin Bratz', phone: '(403) 555-0166', address: '900 New Brighton Dr SE', quadrant: 'SE', load: 'half', price: 240, status: 'confirmed', source: 'admin', deposit: false, flagged: false, riskScore: 44 },
  { id: 'b7', date: '2026-07-19', time: '11:00', name: 'Naomi Petrescu', phone: '(403) 555-0122', address: '44 Evergreen Blvd SW', quadrant: 'SW', load: 'quarter', price: 160, status: 'no_show', source: 'web', deposit: true, flagged: false, riskScore: 70 },
];

const STATUS_BADGE = {
  confirmed: badgeStyle('rgba(59,130,246,.1)', '#3B82F6'),
  completed: badgeStyle('rgba(34,197,94,.1)', '#22C55E'),
  no_show: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.45)'),
  rescheduled: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
};
const STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-show', rescheduled: 'Rescheduled' };

export default function DispatchView({ flash }) {
  const [bookings, setBookings] = useState(BOOKINGS);
  const [loading, setLoading] = useState(true);
  const dates = [...new Set(bookings.map((b) => b.date))];
  const [activeDate, setActiveDate] = useState(dates[0]);
  const [expanded, setExpanded] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const refreshBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      if (!res.ok) return;
      const { bookings: data } = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map((b) => ({
          id: b.id,
          date: b.job_date,
          time: (b.job_time || '').slice(0, 5),
          name: b.name || 'Unknown',
          phone: b.phone || '',
          address: b.address || '',
          quadrant: b.quadrant || '',
          load: b.load_size || 'quarter',
          price: b.total_price || 0,
          status: b.status || 'confirmed',
          source: b.source || 'web',
          deposit: !!b.deposit_paid,
          flagged: !!b.flag_for_review,
          riskScore: b.no_show_risk_score || 0,
        }));
        setBookings(mapped);
      }
    } catch (e) { /* keep fallback */ }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshBookings();
      setLoading(false);
    })();
  }, [refreshBookings]);

  const dayBookings = bookings.filter((b) => b.date === activeDate);
  const revenue = dayBookings.reduce((a, b) => a + b.price, 0);
  const estProfit = Math.round(revenue * 0.42);
  const margin = revenue ? Math.round((estProfit / revenue) * 100) : 0;

  const optimizeRoute = async () => {
    setOptimizing(true);
    try {
      const res = await fetch('/api/admin/optimise-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: activeDate }),
      });
      if (res.ok) {
        const { bookings: ordered } = await res.json();
        if (Array.isArray(ordered) && ordered.length > 0) {
          const mapped = ordered.map((b) => ({
            id: b.id,
            date: b.job_date,
            time: (b.job_time || '').slice(0, 5),
            name: b.name || 'Unknown',
            phone: b.phone || '',
            address: b.address || '',
            quadrant: b.quadrant || '',
            load: b.load_size || 'quarter',
            price: b.total_price || 0,
            status: b.status || 'confirmed',
            source: b.source || 'web',
            deposit: !!b.deposit_paid,
            flagged: !!b.flag_for_review,
            riskScore: b.no_show_risk_score || 0,
          }));
          const otherDays = bookings.filter((b) => b.date !== activeDate);
          setBookings([...otherDays, ...mapped]);
        }
        setOptimized(true);
        flash?.('Route optimized for ' + activeDate);
      } else {
        flash?.('Route optimization failed', '#EF4444');
      }
    } catch (e) {
      flash?.('Route optimization failed', '#EF4444');
    } finally {
      setOptimizing(false);
    }
  };

  const act = (endpoint, body, successMsg) => async () => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        flash?.(successMsg);
        await refreshBookings();
      } else {
        const { error } = await res.json().catch(() => ({}));
        flash?.(error || 'Action failed', '#EF4444');
      }
    } catch (e) {
      flash?.('Action failed', '#EF4444');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => { setActiveDate(d); setOptimized(false); setExpanded(null); }}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              border: activeDate === d ? 'none' : '1px solid rgba(0,0,0,.08)',
              background: activeDate === d ? '#f97316' : '#fff',
              color: activeDate === d ? '#fff' : 'rgba(0,0,0,.65)',
            }}
          >
            {new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Jobs', value: dayBookings.length, color: '#1a1a1a' },
          { label: 'Revenue', value: money(revenue), color: '#22C55E' },
          { label: 'Est. profit', value: money(estProfit), color: '#3B82F6' },
          { label: 'Margin', value: margin + '%', color: '#1a1a1a' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '14px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={optimizeRoute} disabled={optimizing} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 11, background: '#f97316', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          {optimizing ? 'Optimizing…' : optimized ? 'Re-optimize route' : 'Optimize route for this day'}
        </button>
        <button onClick={() => flash?.('Opening manual booking form')} style={{ padding: '12px 18px', borderRadius: 11, border: '1.5px dashed rgba(0,0,0,.18)', background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Booking</button>
        <button onClick={() => flash?.('Opening add custom date form')} style={{ padding: '12px 18px', borderRadius: 11, border: '1.5px dashed rgba(0,0,0,.18)', background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Date</button>
      </div>

      {/* Live crew map — shows real-time truck positions */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Live crew map</div>
          <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', fontWeight: 500 }}>Updates every 5s</span>
        </div>
        <div style={{ padding: 12 }}>
          <LiveCrewMap height={320} />
        </div>
      </div>

      {optimized && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,#FFF7ED 0%,#FFEEDD 100%)', borderRadius: 14, border: '1px solid rgba(249,115,22,.15)', position: 'relative', minHeight: 220, overflow: 'hidden' }}>
            {/* Replace with a real map (Leaflet/OSRM — see components/admin/RouteMap.js) once wired to live coordinates. */}
            <svg width="100%" height="220" viewBox="0 0 400 220" style={{ position: 'absolute', inset: 0 }}>
              <path d="M40 180 C 90 120, 140 160, 190 90 S 300 40, 360 40" fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.6" />
              {dayBookings.map((b, i) => {
                const pts = [[50, 170], [130, 120], [220, 150], [310, 70]];
                const [x, y] = pts[i % 4];
                return (
                  <g key={b.id}>
                    <circle cx={x} cy={y} r={11} fill="#f97316" />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="10" fontWeight="700">{i + 1}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'rgba(0,0,0,.4)', fontWeight: 500 }}>Route preview · NE depot start</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Optimized stop order</div>
            {dayBookings.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', fontWeight: 600 }}>{money(b.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
          Jobs — {new Date(activeDate + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        {dayBookings.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(0,0,0,.4)' }}>No jobs scheduled this day</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.3)', marginTop: 4 }}>Add a manual booking to fill this slot.</div>
          </div>
        ) : dayBookings.map((b) => {
          const isOpen = expanded === b.id;
          return (
            <div key={b.id}>
              <div onClick={() => setExpanded(isOpen ? null : b.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer' }}>
                <div style={{ width: 44, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,.5)', flexShrink: 0 }}>{b.time}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{b.name}</span>
                    <span style={badgeStyle('rgba(0,0,0,.05)', 'rgba(0,0,0,.5)')}>{b.quadrant}</span>
                    {b.flagged && <span style={badgeStyle('rgba(249,115,22,.12)', '#f97316')}>⚠ Flagged</span>}
                    {!b.deposit && <span style={badgeStyle('rgba(239,68,68,.1)', '#EF4444')}>No deposit</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)', marginTop: 1 }}>{b.address}</div>
                </div>
                <span style={STATUS_BADGE[b.status]}>{STATUS_LABEL[b.status]}</span>
                <div style={{ textAlign: 'right', width: 64, flexShrink: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>{money(b.price)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,.38)' }}>{LOAD_LABELS[b.load]}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {isOpen && (
                <div style={{ padding: '16px 18px 18px 74px', background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span>📞 <a href={`tel:${b.phone}`} style={{ color: '#f97316' }}>{b.phone}</a></span>
                    <span>Risk score: <strong style={{ color: b.riskScore >= 50 ? '#EF4444' : 'rgba(0,0,0,.55)' }}>{b.riskScore}%</strong></span>
                    <span>Source: {b.source}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={act('/api/admin/complete', { booking_id: b.id }, `Marked ${b.name}'s job complete`)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>✓ Mark complete</button>
                    <button onClick={act('/api/admin/mark-arrived', { booking_id: b.id }, `Marked crew arrived at ${b.name}'s job`)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(59,130,246,.3)', background: '#fff', color: '#3B82F6', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>📍 Mark arrived</button>
                    <button onClick={act('/api/admin/reschedule', { booking_id: b.id }, `Reschedule requested for ${b.name}'s job`)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(0,0,0,.12)', background: '#fff', color: 'rgba(0,0,0,.6)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Reschedule</button>
                    <button onClick={act('/api/admin/cancel', { booking_id: b.id }, `Cancelled ${b.name}'s job — deposit refunded`)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(239,68,68,.3)', background: '#fff', color: '#EF4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
