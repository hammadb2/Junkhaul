'use client';
// Redesigned "Schedule" view. Real data: GET /api/slots for the days/slots
// structure, and GET /api/admin/bookings for booked counts.

import { useState, useEffect } from 'react';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

export default function ScheduleView() {
  const [bookingsByDate, setBookingsByDate] = useState({});
  const [slotTimes, setSlotTimes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [slotsRes, bkRes] = await Promise.all([
          fetch('/api/slots'),
          fetch('/api/admin/bookings'),
        ]);
        const slotsData = slotsRes.ok ? await slotsRes.json() : null;
        const bkData = bkRes.ok ? await bkRes.json() : null;
        if (cancelled) return;

        // Build bookings-by-date map from admin bookings
        const byDate = {};
        if (bkData && Array.isArray(bkData.bookings)) {
          for (const b of bkData.bookings) {
            const d = b.job_date;
            if (!byDate[d]) byDate[d] = [];
            byDate[d].push({ time: (b.job_time || '').slice(0, 5), price: b.total_price || 0 });
          }
        }

        // Extract slot times from the slots API
        const allSlotTimes = new Set();
        if (slotsData && Array.isArray(slotsData.days)) {
          for (const day of slotsData.days) {
            if (Array.isArray(day.slots)) {
              for (const s of day.slots) {
                if (s.time) allSlotTimes.add(s.time);
                else if (s.window_start) allSlotTimes.add(s.window_start);
              }
            }
          }
        }
        const times = [...allSlotTimes].sort();

        setBookingsByDate(byDate);
        setSlotTimes(times);
      } catch (e) {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;
  if (Object.keys(bookingsByDate).length === 0 && slotTimes.length === 0) return <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No schedule data available</div>;

  const dates = Object.keys(bookingsByDate);
  const totalBooked = dates.reduce((a, d) => a + bookingsByDate[d].length, 0);

  const rows = dates.map((d) => {
    const jobs = bookingsByDate[d];
    const slots = slotTimes.map((t) => {
      const filled = jobs.some((j) => j.time === t);
      return { t, style: filled ? badgeStyle('rgba(249,115,22,.12)', '#f97316') : badgeStyle('rgba(0,0,0,.05)', 'rgba(0,0,0,.35)') };
    });
    const dt = new Date(d + 'T12:00:00');
    return {
      date: dt.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' }),
      dayType: [0, 6].includes(dt.getDay()) ? 'Weekend' : 'Weekday',
      slots, bookedFrac: `${jobs.length}/${slotTimes.length}`, revenue: money(jobs.reduce((a, j) => a + j.price, 0)),
    };
  });

  const stats = [
    { label: 'Upcoming slots', value: dates.length * slotTimes.length, color: '#1a1a1a' },
    { label: 'Booked this week', value: totalBooked, color: '#f97316' },
    { label: 'Avg fill rate', value: dates.length > 0 ? Math.round((totalBooked / (dates.length * slotTimes.length)) * 100) + '%' : '0%', color: '#1a1a1a' },
    { label: 'Open slots', value: dates.length * slotTimes.length - totalBooked, color: '#22C55E' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              {['Date', 'Day type', 'Slots', 'Booked', 'Est. revenue'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left', padding: i === 0 ? '11px 18px' : i === 4 ? '11px 18px' : '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '12px 18px', fontWeight: 600, color: '#1a1a1a' }}>{row.date}</td>
                <td style={{ padding: 12, color: 'rgba(0,0,0,.55)' }}>{row.dayType}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {row.slots.map((slot) => <span key={slot.t} style={slot.style}>{slot.t}</span>)}
                  </div>
                </td>
                <td style={{ padding: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1a1a1a' }}>{row.bookedFrac}</td>
                <td style={{ padding: '12px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#22C55E' }}>{row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
