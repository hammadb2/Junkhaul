'use client';
// Redesigned "Dispatch" view — replaces the `view === 'dispatch'` block in
// app/admin/page.js. Real data: GET /api/admin/bookings; route optimize:
// POST /api/admin/optimise-route; actions: POST /api/admin/{complete,
// mark-arrived,cancel,reschedule}.

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { money, badgeStyle, LOAD_LABELS } from '@/lib/adminUiHelpers';

const LiveCrewMap = dynamic(() => import('./LiveCrewMap'), { ssr: false });

const STATUS_BADGE = {
  confirmed: badgeStyle('rgba(59,130,246,.1)', '#3B82F6'),
  completed: badgeStyle('rgba(34,197,94,.1)', '#22C55E'),
  no_show: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.45)'),
  rescheduled: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
};
const STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-show', rescheduled: 'Rescheduled' };

export default function DispatchView({ flash }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({ name: '', phone: '', address: '', load_size: 'single_item', job_date: '', job_time: '10:00', total_price: 99 });
  const [showDateForm, setShowDateForm] = useState(false);
  const [newDate, setNewDate] = useState('');

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
          possibleCrossPhotoDuplicates: b.possible_cross_photo_duplicates || null,
        }));
        setBookings(mapped);
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshBookings();
      setLoading(false);
    })();
  }, [refreshBookings]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const dates = [...new Set(bookings.map((b) => b.date))];
  const effectiveDate = activeDate || dates[0] || null;
  const dayBookings = bookings.filter((b) => b.date === effectiveDate);
  const revenue = dayBookings.reduce((a, b) => a + b.price, 0);
  const estProfit = Math.round(revenue * 0.42);
  const margin = revenue ? Math.round((estProfit / revenue) * 100) : 0;

  const optimizeRoute = async () => {
    setOptimizing(true);
    try {
      const res = await fetch('/api/admin/optimise-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: effectiveDate }),
      });
      if (res.ok) {
        const data = await res.json();
        const ordered = data.order || data.bookings || [];
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
          const otherDays = bookings.filter((b) => b.date !== effectiveDate);
          setBookings([...otherDays, ...mapped]);
        }
        setOptimized(true);
        flash?.('Route optimized for ' + effectiveDate);
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
      {dates.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No bookings found</div>
      ) : (<>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => { setActiveDate(d); setOptimized(false); setExpanded(null); }}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              border: effectiveDate === d ? 'none' : '1px solid rgba(0,0,0,.08)',
              background: effectiveDate === d ? '#f97316' : '#fff',
              color: effectiveDate === d ? '#fff' : 'rgba(0,0,0,.65)',
            }}
          >
            {new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Jobs', value: dayBookings.length, color: '#1a1a1a' },
          { label: 'Revenue', value: money(revenue), color: '#22C55E' },
          { label: 'Est. profit (42%)', value: money(estProfit), color: '#3B82F6' },
          { label: 'Margin', value: margin + '%', color: '#1a1a1a' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={optimizeRoute} disabled={optimizing} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 11, background: '#f97316', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          {optimizing ? 'Optimizing…' : optimized ? 'Re-optimize route' : 'Optimize route for this day'}
        </button>
        <button onClick={() => setShowBookingForm(true)} style={{ padding: '12px 18px', borderRadius: 11, border: '1.5px dashed rgba(0,0,0,.18)', background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Booking</button>
        <button onClick={() => setShowDateForm(true)} style={{ padding: '12px 18px', borderRadius: 11, border: '1.5px dashed rgba(0,0,0,.18)', background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Date</button>
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
          Jobs — {effectiveDate ? new Date(effectiveDate + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
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
              <div onClick={() => setExpanded(isOpen ? null : b.id)} onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(isOpen ? null : b.id); }} tabIndex={0} role="button" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid rgba(0,0,0,.045)', cursor: 'pointer' }}>
                <div style={{ width: 44, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,.5)', flexShrink: 0 }}>{b.time}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>{b.name}</span>
                    <span style={badgeStyle('rgba(0,0,0,.05)', 'rgba(0,0,0,.5)')}>{b.quadrant}</span>
                    {b.flagged && <span style={badgeStyle('rgba(249,115,22,.12)', '#f97316')}>Flagged</span>}
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
                    <span><a href={`tel:${b.phone}`} style={{ color: '#f97316' }}>{b.phone}</a></span>
                    <span>Risk score: <strong style={{ color: b.riskScore >= 50 ? '#EF4444' : 'rgba(0,0,0,.55)' }}>{b.riskScore}%</strong></span>
                    <span>Source: {b.source}</span>
                  </div>
                  {b.possibleCrossPhotoDuplicates?.length > 0 && (
                    <div style={{ fontSize: 12, color: '#7c3aed', background: 'rgba(124,58,237,.06)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                      🔍 Possible cross-photo duplicates — confirm at pickup: {b.possibleCrossPhotoDuplicates.join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={act('/api/admin/complete', { booking_id: b.id }, `Marked ${b.name}'s job complete`)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#22C55E', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Mark complete</button>
                    <button onClick={act('/api/admin/mark-arrived', { booking_id: b.id }, `Marked crew arrived at ${b.name}'s job`)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(59,130,246,.3)', background: '#fff', color: '#3B82F6', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Mark arrived</button>
                    <button onClick={async () => {
                      const newDate = window.prompt('New date (YYYY-MM-DD):');
                      if (!newDate) return;
                      const newTime = window.prompt('New time (HH:MM):');
                      if (!newTime) return;
                      try {
                        const res = await fetch('/api/admin/reschedule', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ booking_id: b.id, new_date: newDate, new_time: newTime }),
                        });
                        if (res.ok) {
                          flash?.(`Rescheduled ${b.name} to ${newDate} at ${newTime}`);
                          refreshBookings();
                        } else {
                          flash?.('Failed to reschedule', '#EF4444');
                        }
                      } catch (e) {
                        flash?.('Failed to reschedule', '#EF4444');
                      }
                    }} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(0,0,0,.12)', background: '#fff', color: 'rgba(0,0,0,.6)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Reschedule</button>
                    <button onClick={act('/api/admin/cancel', { booking_id: b.id }, `Cancelled ${b.name}'s job — deposit refunded`)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(239,68,68,.3)', background: '#fff', color: '#EF4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>)}
      {showBookingForm && (
        <div onClick={() => setShowBookingForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>New Booking</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Customer name" value={newBooking.name} onChange={e => setNewBooking(s => ({ ...s, name: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
              <input placeholder="Phone" value={newBooking.phone} onChange={e => setNewBooking(s => ({ ...s, phone: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
              <input placeholder="Address" value={newBooking.address} onChange={e => setNewBooking(s => ({ ...s, address: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="date" value={newBooking.job_date} onChange={e => setNewBooking(s => ({ ...s, job_date: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
                <input type="time" value={newBooking.job_time} onChange={e => setNewBooking(s => ({ ...s, job_time: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <select value={newBooking.load_size} onChange={e => setNewBooking(s => ({ ...s, load_size: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }}>
                  <option value="single_item">Single item</option>
                  <option value="quarter">Quarter load</option>
                  <option value="half">Half load</option>
                  <option value="full">Full load</option>
                </select>
                <input type="number" placeholder="Price" value={newBooking.total_price} onChange={e => setNewBooking(s => ({ ...s, total_price: Number(e.target.value) }))} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBookingForm(false)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.6)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={async () => {
                if (!newBooking.name || !newBooking.phone || !newBooking.job_date) {
                  flash?.('Name, phone, and date are required', '#EF4444');
                  return;
                }
                try {
                  const res = await fetch('/api/admin/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBooking),
                  });
                  if (res.ok) {
                    flash?.('Booking created');
                    setShowBookingForm(false);
                    setNewBooking({ name: '', phone: '', address: '', load_size: 'single_item', job_date: '', job_time: '10:00', total_price: 99 });
                    refreshBookings();
                  } else {
                    flash?.('Failed to create booking', '#EF4444');
                  }
                } catch (e) {
                  flash?.('Failed to create booking', '#EF4444');
                }
              }} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create booking</button>
            </div>
          </div>
        </div>
      )}
      {showDateForm && (
        <div onClick={() => setShowDateForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 360 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Add date tab</div>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', fontSize: 13, outline: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDateForm(false)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid rgba(0,0,0,.1)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.6)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => {
                if (newDate) {
                  setActiveDate(newDate);
                  setShowDateForm(false);
                  setNewDate('');
                  flash?.(`Switched to ${newDate}`);
                }
              }} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add date</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
