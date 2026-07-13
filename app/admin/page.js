'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import { LOAD_LABELS, calculatePrice } from '@/lib/pricingConstants';
import ConfigPanel from '@/components/admin/ConfigPanel';
import AuditTrail from '@/components/admin/AuditTrail';
import CallsPanel from '@/components/admin/CallsPanel';
import ReferralsPanel from '@/components/admin/ReferralsPanel';
import IntelPanel from '@/components/admin/IntelPanel';
import GrowthPanel from '@/components/admin/GrowthPanel';
import CommandCenter from '@/components/admin/CommandCenter';
import BookingTimeline from '@/components/admin/BookingTimeline';
import CrewView from '@/components/admin/CrewView';
import PayrollPanel from '@/components/admin/PayrollPanel';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { formatTime, formatDateLong } from '@/lib/dates';

const RouteMap = dynamic(() => import('@/components/admin/RouteMap'), { ssr: false });

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState('home');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);
  const [routeOrder, setRouteOrder] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [optimising, setOptimising] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bookings');
    const data = await res.json();
    setBookings(data.bookings || []);
    setStats(data.stats || null);
    if (!activeDate && data.bookings?.length) setActiveDate(data.bookings[0].job_date);
    setLoading(false);
  }, [activeDate]);

  useEffect(() => {
    load();
    if (view === 'dispatch') {
      const interval = setInterval(load, 60000);
      return () => clearInterval(interval);
    }
  }, [load, view]);

  const dates = [...new Set(bookings.map((b) => b.job_date))];
  const dayBookings = bookings.filter((b) => b.job_date === activeDate);

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const optimise = async () => {
    setOptimising(true);
    setRouteOrder(null);
    setRouteSummary(null);
    const res = await fetch('/api/admin/optimise-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: activeDate }),
    });
    const data = await res.json();
    setRouteOrder(data.order || []);
    setRouteSummary(data.summary || null);
    setOptimising(false);
  };

  const act = async (path, body, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      alert(data.error || 'Action failed');
      return;
    }
    await load();
  };

  const NAV = [
    { id: 'home', label: 'Dashboard', icon: '◉' },
    { id: 'dispatch', label: 'Dispatch', icon: '▦' },
    { id: 'schedule', label: 'Schedule', icon: '☰' },
    { id: 'earnings', label: 'Earnings', icon: '$' },
    { id: 'crew', label: 'Crew', icon: '👥' },
    { id: 'payroll', label: 'Payroll', icon: '$' },
    { id: 'waitlist', label: 'Waitlist', icon: '⏳' },
    { id: 'leads', label: 'Leads', icon: '📋' },
    { id: 'growth', label: 'Growth', icon: '↗' },
    { id: 'calls', label: 'Calls', icon: '📞' },
    { id: 'intel', label: 'Intel', icon: '◆' },
    { id: 'referrals', label: 'Referrals', icon: '🔗' },
    { id: 'config', label: 'Config', icon: '⚙' },
    { id: 'audit', label: 'Audit', icon: '◷' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#FAFAFA' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, minWidth: 220, background: '#fff', borderRight: '1px solid rgba(0,0,0,.06)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <Logo className="h-6" />
        </div>
        <nav style={{ flex: 1, padding: '0 8px' }}>
          {NAV.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 14, fontWeight: view === id ? 600 : 500,
                background: view === id ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: view === id ? '#f97316' : 'rgba(0,0,0,.65)',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 12px', borderRadius: 10,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 13, fontWeight: 500, background: 'transparent',
              color: 'rgba(0,0,0,.45)',
            }}
          >
            ← Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid rgba(0,0,0,.06)',
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize' }}>
            {view}
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(0,0,0,.5)' }}>
              <span><strong style={{ color: '#1a1a1a' }}>{stats.jobs}</strong> jobs</span>
              <span><strong style={{ color: '#1a1a1a' }}>${stats.revenue}</strong> revenue</span>
              {stats.flagged > 0 && <span style={{ color: '#EF4444' }}>{stats.flagged} flagged</span>}
            </div>
          )}
        </div>

        <div style={{ padding: 20, maxWidth: 960 }}>
          {view === 'dispatch' && (
            <>
              {stats && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <MiniStat label="Jobs" value={stats.jobs} />
                  <MiniStat label="Revenue" value={`$${stats.revenue}`} color="#22C55E" />
                  <MiniStat label="Flagged" value={stats.flagged} color={stats.flagged > 0 ? '#EF4444' : undefined} />
                  <MiniStat label="High risk" value={stats.high_risk} color={stats.high_risk > 0 ? '#EF4444' : undefined} />
                </div>
              )}

              {loading ? (
                <p className="text-black/50 text-center py-10">Loading…</p>
              ) : dates.length === 0 ? (
                <p className="text-black/50 text-center py-10">No upcoming jobs.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }} className="no-scrollbar">
                    {dates.map((d) => (
                      <button
                        key={d}
                        onClick={() => { setActiveDate(d); setRouteOrder(null); }}
                        style={{
                          padding: '8px 16px', borderRadius: 10, border: activeDate === d ? 'none' : '1px solid rgba(0,0,0,.08)',
                          background: activeDate === d ? '#f97316' : '#fff',
                          color: activeDate === d ? '#fff' : 'rgba(0,0,0,.7)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateLong(d)}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={optimise}
                      disabled={optimising}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                        background: optimising ? 'rgba(249,115,22,.4)' : '#f97316',
                        color: '#fff', fontSize: 14, fontWeight: 600, cursor: optimising ? 'default' : 'pointer',
                      }}
                    >
                      {optimising ? 'Optimising route…' : 'Optimise route for this day'}
                    </button>
                    <ManualBookingButton onCreated={load} />
                    <AddCustomDateButton onAdded={load} />
                  </div>

                  {routeOrder && routeOrder.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <RouteMap stops={routeOrder} />
                      {routeSummary && (
                        <div className="grid grid-cols-4 gap-2">
                          <MiniStat label="Jobs" value={routeSummary.jobs} />
                          <MiniStat label="Revenue" value={`$${routeSummary.total_revenue}`} color="#22C55E" />
                          <MiniStat label="Est. Profit" value={`$${routeSummary.total_est_profit}`} color="#3B82F6" />
                          <MiniStat label="Margin" value={routeSummary.avg_margin} />
                        </div>
                      )}
                      <ol className="bg-white rounded-xl border border-black/[0.06] divide-y">
                        {routeOrder.map((s) => (
                          <li key={s.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                            <span className="w-7 h-7 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {s.position}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">{s.name}</span>
                                <span className="text-black/40 text-xs">{s.quadrant}</span>
                              </div>
                              <div className="text-xs text-black/50 truncate">{s.address}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold">${s.total_price}</div>
                              {s.est_profit !== undefined && (
                                <div className="text-xs text-[#22C55E]">~${s.est_profit}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="space-y-3">
                    {dayBookings.map((b) => (
                      <JobCard key={b.id} b={b} act={act} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {view === 'home' && <CommandCenter />}
          {view === 'schedule' && <ScheduleView />}
          {view === 'earnings' && <EarningsDashboard />}
          {view === 'waitlist' && <WaitlistView />}
          {view === 'leads' && <LeadsView />}
          {view === 'growth' && <GrowthPanel />}
          {view === 'calls' && <CallsPanel />}
          {view === 'intel' && <IntelPanel />}
          {view === 'referrals' && <ReferralsPanel />}
          {view === 'crew' && <CrewView />}
          {view === 'payroll' && <PayrollPanel />}
          {view === 'config' && <ConfigPanel />}
          {view === 'audit' && <AuditTrail />}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// MINI STAT — compact card for sidebar layout
// ============================================================
function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '12px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ============================================================
// JOB CARD — upgraded with all improvements
// ============================================================
function JobCard({ b, act }) {
  const [open, setOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(b.job_date);
  const [rescheduleTime, setRescheduleTime] = useState(b.job_time);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [crewPhotos, setCrewPhotos] = useState(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [arriving, setArriving] = useState(false);
  const done = b.status === 'completed';
  const isNoShow = b.status === 'no_show';

  const loadRescheduleSlots = async (date) => {
    setRescheduleDate(date);
    if (!date) return;
    const res = await fetch('/api/slots');
    const data = await res.json();
    const day = (data.days || []).find((d) => d.date === date);
    setRescheduleSlots(day?.slots || []);
  };

  const loadCrewPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/admin/get-job-photos?booking_id=${b.id}`);
      const d = await res.json();
      if (res.ok) setCrewPhotos(d);
    } catch { /* ignore */ }
    setLoadingPhotos(false);
  };

  const markArrived = async () => {
    if (!window.confirm(`Mark ${b.name} as crew arrived?`)) return;
    setArriving(true);
    await act('mark-arrived', { booking_id: b.id });
    setArriving(false);
  };

  const uploadCrewPhoto = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('booking_id', b.id);
      fd.append('type', type);
      try {
        const res = await fetch('/api/admin/upload-crew-photo', { method: 'POST', body: fd });
        if (res.ok) { loadCrewPhotos(); }
      } catch { /* ignore */ }
    };
    input.click();
  };

  return (
    <div className={`bg-white rounded-2xl border p-4 ${
      b.flag_for_review ? 'border-orange-300' :
      isNoShow ? 'border-gray-300' :
      'border-black/[0.06]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1a1a1a]">{b.name}</span>
            {b.quadrant && <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{b.quadrant}</span>}
            {b.source && b.source !== 'web' && (
              <span className="text-xs bg-[#3B82F6]/10 text-[#3B82F6] rounded px-1.5 py-0.5 capitalize">{b.source}</span>
            )}
            {!b.deposit_paid && (
              <span className="text-xs bg-[#EF4444]/10 text-[#EF4444] rounded px-1.5 py-0.5">⚠️ No deposit</span>
            )}
            {done && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">Done</span>}
            {isNoShow && <span className="text-xs bg-gray-100 text-black/50 rounded px-1.5 py-0.5">No-show</span>}
          </div>
          <a href={`tel:${b.phone}`} className="text-sm text-[#f97316]">{b.phone}</a>
          <p className="text-sm text-black/50">{b.address}</p>
        </div>
        <div className="text-right">
          <div className="font-bold">{formatTime(b.job_time)}</div>
          <div className="text-sm text-black/50">{LOAD_LABELS[b.load_size]}</div>
          <div className="text-sm font-semibold">${b.total_price}</div>
          <button
            onClick={() => setShowTimeline(true)}
            className="text-xs text-[#f97316] underline mt-1"
          >
            History
          </button>
        </div>
      </div>

      {showTimeline && <BookingTimeline bookingId={b.id} onClose={() => setShowTimeline(false)} />}

      {/* Flags */}
      {b.flag_for_review && (
        <p className="mt-2 text-xs text-orange-700 bg-[#f97316]/10 rounded p-2">
          🚨 {b.flag_reason || 'Flagged for review'}
        </p>
      )}
      {b.has_freon && <p className="mt-1 text-xs text-blue-700">🌡️ Freon appliance ({b.freon_count || 1}), bring straps</p>}
      {(b.no_show_risk_score || 0) >= 50 && (
        <p className="mt-1 text-xs text-[#EF4444]">⚠️ No-show risk {b.no_show_risk_score}%</p>
      )}

      {/* Booking notes (from customer at booking time) */}
      {b.description_text && (
        <p className="mt-2 text-xs text-black/50 bg-[#FAFAFA] rounded p-2">
          📋 {b.description_text}
        </p>
      )}

      {/* Customer notes (new field) */}
      {b.customer_notes && (
        <p className="mt-2 text-xs text-orange-700 bg-[#f97316]/10 border border-[#f97316]/20 rounded p-2">
          📝 Customer notes: {b.customer_notes}
        </p>
      )}

      {/* Photos with lightbox */}
      {b.photos?.length > 0 && (
        <>
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {b.photos.map((p, i) => (
              <button key={i} onClick={() => setLightbox(p)} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="job" className="h-16 w-16 rounded-lg object-cover" />
              </button>
            ))}
          </div>
          {lightbox && (
            <div
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox} alt="job photo" className="max-w-full max-h-full rounded-xl object-contain" />
            </div>
          )}
        </>
      )}

      {/* Operator notes */}
      <OperatorNotes bookingId={b.id} initial={b.operator_notes} />

      {/* Action buttons */}
      {!done && !isNoShow && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() =>
              act('complete', { booking_id: b.id }, `Mark ${b.name}'s job as complete and collect $${b.balance_due} balance?`)
            }
            className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg"
          >
            ✓ Complete
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex-1 border border-gray-300 text-sm font-semibold py-2 rounded-lg"
          >
            ···
          </button>
        </div>
      )}

      {/* Management panel */}
      {open && !done && !isNoShow && !rescheduling && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() =>
                act('cancel', { booking_id: b.id, reason: 'Operator cancelled', by: 'operator' }, 'Cancel job and refund $50?')
              }
              className="border border-red-300 text-[#EF4444] text-sm py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => act('no-show', { booking_id: b.id }, `Mark ${b.name} as a no-show?`)}
              className="border border-orange-300 text-[#f97316] text-sm py-2 rounded-lg"
            >
              No-show
            </button>
            <button
              onClick={() => { setRescheduling(true); loadRescheduleSlots(b.job_date); }}
              className="border border-gray-300 text-sm py-2 rounded-lg"
            >
              Reschedule
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={markArrived}
              disabled={arriving}
              className="border border-[#3B82F6]/30 text-[#3B82F6] text-sm py-2 rounded-lg"
            >
              {arriving ? '…' : '📍 Mark arrived'}
            </button>
            <button
              onClick={() => { if (!crewPhotos) loadCrewPhotos(); setCrewPhotos(crewPhotos || {}); }}
              className="border border-gray-300 text-sm py-2 rounded-lg"
            >
              📸 Crew photos
            </button>
          </div>
          <QuickSMS bookingId={b.id} phone={b.phone} name={b.name} />
        </div>
      )}

      {/* Inline reschedule UI */}
      {rescheduling && !done && !isNoShow && (
        <div className="mt-3 space-y-2 border border-black/[0.06] rounded-xl p-3">
          <p className="text-xs font-semibold text-black/60">Reschedule to:</p>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => loadRescheduleSlots(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {rescheduleSlots.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {rescheduleSlots.map((s) => (
                <button
                  key={s.time}
                  onClick={() => setRescheduleTime(s.time)}
                  className={`px-2 py-1 rounded text-xs ${
                    rescheduleTime === s.time ? 'bg-[#f97316] text-white' : 'bg-gray-100 text-black/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setRescheduling(false)}
              className="flex-1 border border-gray-300 text-sm py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                act('reschedule', {
                  booking_id: b.id,
                  new_date: rescheduleDate,
                  new_time: rescheduleTime,
                });
                setRescheduling(false);
              }}
              className="flex-1 bg-[#f97316] text-white text-sm font-semibold py-2 rounded-lg"
            >
              Confirm reschedule
            </button>
          </div>
        </div>
      )}

      {/* Crew photos modal */}
      {crewPhotos && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setCrewPhotos(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-black/[0.06] px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a1a]">Crew photos — {b.name}</h3>
              <button onClick={() => setCrewPhotos(null)} className="text-black/40 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {loadingPhotos && <p className="text-center text-black/40 py-6">Loading…</p>}
              {!loadingPhotos && (
                <>
                  {crewPhotos.crew_arrived_at && (
                    <p className="text-xs text-[#22C55E]">● Crew arrived {new Date(crewPhotos.crew_arrived_at).toLocaleString('en-CA', { timeZone: 'America/Edmonton' })}</p>
                  )}
                  {/* Crew arrival photos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-black/70">Arrival photos</h4>
                      <button onClick={() => uploadCrewPhoto('crew_arrival')} className="text-xs text-[#f97316] font-medium">+ Upload</button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(crewPhotos.crew_arrival_photos || []).map((url, i) => (
                        <button key={i} onClick={() => setLightbox(url)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="arrival" className="h-20 w-20 rounded-lg object-cover" />
                        </button>
                      ))}
                      {(crewPhotos.crew_arrival_photos || []).length === 0 && <p className="text-xs text-black/30">None yet</p>}
                    </div>
                  </div>
                  {/* Crew completion photos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-black/70">Completion photos</h4>
                      <button onClick={() => uploadCrewPhoto('crew_completion')} className="text-xs text-[#f97316] font-medium">+ Upload</button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(crewPhotos.crew_completion_photos || []).map((url, i) => (
                        <button key={i} onClick={() => setLightbox(url)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="completion" className="h-20 w-20 rounded-lg object-cover" />
                        </button>
                      ))}
                      {(crewPhotos.crew_completion_photos || []).length === 0 && <p className="text-xs text-black/30">None yet</p>}
                    </div>
                  </div>
                  {/* Customer photos */}
                  {(crewPhotos.customer_photos || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-black/70 mb-2">Customer photos ({crewPhotos.customer_photos.length})</h4>
                      <div className="flex gap-2 flex-wrap">
                        {crewPhotos.customer_photos.map((url, i) => (
                          <button key={i} onClick={() => setLightbox(url)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="customer" className="h-20 w-20 rounded-lg object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// OPERATOR NOTES
// ============================================================
function OperatorNotes({ bookingId, initial }) {
  const [notes, setNotes] = useState(initial || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch('/api/admin/update-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, operator_notes: notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-2 space-y-1">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Operator notes (e.g. gate code, extra items, cash collected)"
        className="w-full border border-black/[0.06] rounded-lg px-2 py-1.5 text-xs h-14 resize-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs text-[#f97316] font-medium"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save notes'}
      </button>
    </div>
  );
}

// ============================================================
// QUICK SMS
// ============================================================
function QuickSMS({ bookingId, phone, name }) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await fetch('/api/admin/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, phone, message: msg }),
    });
    setSending(false);
    setSent(true);
    setMsg('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-1">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder={`Quick text to ${name}…`}
        className="w-full border border-black/[0.06] rounded-lg px-2 py-1.5 text-xs h-14 resize-none"
      />
      <button
        onClick={send}
        disabled={sending || !msg.trim()}
        className="w-full bg-[#f97316] text-white text-sm py-2 rounded-lg font-medium disabled:bg-gray-300"
      >
        {sending ? 'Sending…' : sent ? '✓ Sent' : `📱 Send to ${name}`}
      </button>
    </div>
  );
}

// ============================================================
// EARNINGS DASHBOARD
// ============================================================
function EarningsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/earnings')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (loading) return <p className="text-center text-black/40 py-10">Loading earnings…</p>;
  if (!data || data.error) return <p className="text-center text-black/40 py-10">Failed to load earnings.</p>;

  const sources = Object.entries(data.sourceBreakdown || {}).sort((a, b) => b[1].count - a[1].count);
  const totalEarned = data.totalEarned || 0;
  const totalPipeline = data.totalPipeline || 0;
  const avgJobValue = data.avgJobValue || 0;

  return (
    <div className="space-y-4">
      <DepartureCountdown />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
          <div className="text-2xl font-bold text-[#1a1a1a]">${totalEarned.toLocaleString()}</div>
          <div className="text-sm text-black/50 mt-1">Total earned</div>
          <div className="text-xs text-black/40">{data.completedJobs || 0} jobs completed</div>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
          <div className="text-2xl font-bold text-[#f97316]">${totalPipeline.toLocaleString()}</div>
          <div className="text-sm text-black/50 mt-1">In pipeline</div>
          <div className="text-xs text-black/40">{data.upcomingJobs || 0} confirmed upcoming</div>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
          <div className="text-2xl font-bold text-[#1a1a1a]">${avgJobValue}</div>
          <div className="text-sm text-black/50 mt-1">Avg job value</div>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
          <div className="text-2xl font-bold text-[#22C55E]">
            ${(totalEarned + totalPipeline).toLocaleString()}
          </div>
          <div className="text-sm text-black/50 mt-1">Total + pipeline</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <h3 className="font-semibold text-[#1a1a1a] mb-3">Where bookings come from</h3>
        <div className="space-y-2">
          {sources.map(([source, stats]) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium text-gray-800">{source}</span>
                <span className="text-black/40">{stats.count} jobs</span>
              </div>
              <span className="font-semibold text-black/70">${stats.revenue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <h3 className="font-semibold text-[#1a1a1a] mb-3">Revenue by work day</h3>
        <div className="space-y-2">
          {Object.entries(data.byDate).map(([date, stats]) => (
            <div key={date} className="flex items-center justify-between text-sm">
              <span className="text-black/60">{date}</span>
              <div className="flex gap-3">
                <span className="text-black/40">{stats.jobs} jobs</span>
                <span className="font-semibold">${stats.revenue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WAITLIST VIEW
// ============================================================
function WaitlistView() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/admin/waitlist')
      .then((r) => r.json())
      .then((d) => { setList(d.waitlist || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const notify = async (entry) => {
    if (!window.confirm(`Text ${entry.name} a slot-open notification?`)) return;
    await fetch('/api/admin/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, phone: entry.phone, name: entry.name }),
    });
    load();
  };

  if (loading) return <p className="text-center text-black/40 py-10">Loading waitlist…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-black/50">{list.length} {list.length === 1 ? 'person' : 'people'} waiting for a slot</p>
      {list.length === 0 && (
        <p className="text-center text-black/40 py-10">Waitlist is empty.</p>
      )}
      {list.map((entry) => (
        <div key={entry.id} className="bg-white rounded-2xl border border-black/[0.06] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-[#1a1a1a]">{entry.name}</p>
              <a href={`tel:${entry.phone}`} className="text-sm text-[#f97316]">{entry.phone}</a>
              {entry.address && <p className="text-xs text-black/50 mt-0.5">{entry.address}</p>}
              <div className="flex gap-2 mt-1 flex-wrap">
                {entry.preferred_day_type && (
                  <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 capitalize">{entry.preferred_day_type}</span>
                )}
                {entry.load_size && (
                  <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 capitalize">{entry.load_size}</span>
                )}
                <span className="text-xs text-black/40">
                  Joined {new Date(entry.created_at).toLocaleDateString()}
                </span>
                {entry.notified && (
                  <span className="text-xs bg-[#3B82F6]/10 text-[#3B82F6] rounded px-1.5 py-0.5">Notified</span>
                )}
              </div>
            </div>
            <button
              onClick={() => notify(entry)}
              className="bg-[#f97316] text-white text-xs font-semibold px-3 py-2 rounded-lg ml-3 flex-shrink-0"
            >
              Notify
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MANUAL BOOKING
// ============================================================
function ManualBookingButton({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', address_data: null, unit: '',
    load_size: 'quarter',
    job_date: '', job_time: '09:00',
    same_day: false, stairs: 0, has_freon: false, freon_count: 0,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const loadSlots = async (date) => {
    if (!date) return;
    const res = await fetch(`/api/slots`);
    const data = await res.json();
    const day = (data.days || []).find((d) => d.date === date);
    setAvailableSlots(day?.slots || []);
    setShowSlots(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: 'admin',
          photo_skipped: true,
          has_freon: form.freon_count > 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOpen(false);
      setForm({ name: '', phone: '', email: '', address: '', address_data: null, unit: '', load_size: 'quarter', job_date: '', job_time: '09:00', same_day: false, stairs: 0, has_freon: false, freon_count: 0, notes: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '12px 16px', borderRadius: 12, border: '1px dashed rgba(0,0,0,.2)',
          background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        + Booking
      </button>
    );
  }

  const livePrice = calculatePrice({
    load_size: form.load_size,
    same_day: form.same_day,
    stairs: parseInt(form.stairs) || 0,
    has_freon: form.freon_count > 0,
    freon_count: parseInt(form.freon_count) || 0,
  });

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-3">
      <h3 className="font-bold text-[#1a1a1a]">Manual booking</h3>

      <div className="space-y-2">
        <input value={form.name} onChange={set('name')} placeholder="Customer name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.phone} onChange={set('phone')} placeholder="Phone (+1...)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.email} onChange={set('email')} placeholder="Email (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v, address_data: null }))}
          onSelect={(feature) => {
            const ctx = (feature.context || []).reduce((acc, c) => { acc[c.id.split('.')[0]] = c.text; return acc; }, {});
            setForm((f) => ({
              ...f,
              address: feature.place_name,
              address_data: {
                full_address: feature.place_name,
                street: feature.text,
                postal_code: ctx.postcode || '',
                city: ctx.place || 'Calgary',
                province: ctx.region || 'Alberta',
                country: ctx.country || 'Canada',
                lat: feature.center?.[1] || null,
                lng: feature.center?.[0] || null,
                place_id: feature.id,
              },
            }));
          }}
          placeholder="Pickup address"
        />
        <input value={form.unit} onChange={set('unit')} placeholder="Unit / apt (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={form.load_size} onChange={set('load_size')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="single_item">1-2 items ($99)</option>
          <option value="quarter">Small ($160)</option>
          <option value="half">Half ($240)</option>
          <option value="full">Full ($380)</option>
        </select>
        <input type="date" value={form.job_date} onChange={(e) => { set('job_date')(e); loadSlots(e.target.value); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      {showSlots && availableSlots.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableSlots.map((s) => (
            <button
              key={s.time}
              onClick={() => setForm((f) => ({ ...f, job_time: s.time }))}
              className={`px-2 py-1 rounded text-xs ${form.job_time === s.time ? 'bg-[#f97316] text-white' : 'bg-gray-100 text-black/70'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <input type="time" value={form.job_time} onChange={set('job_time')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-black/50">Freon appliances ($40 each)</label>
          <input type="number" min="0" max="10" value={form.freon_count} onChange={set('freon_count')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-black/50">Stairs (flights, $25 each)</label>
          <input type="number" min="0" max="10" value={form.stairs} onChange={set('stairs')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-black/60">
        <input type="checkbox" checked={form.same_day} onChange={setBool('same_day')} className="w-4 h-4 rounded" />
        Same-day pickup (+$50)
      </label>

      <textarea value={form.notes} onChange={set('notes')} placeholder="Internal notes (optional, not sent to customer)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16" />

      <div className="bg-[#FAFAFA] rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span>Base ({LOAD_LABELS[form.load_size]})</span><span>${livePrice.base_price}</span></div>
        {livePrice.freon_fee > 0 && <div className="flex justify-between"><span>Freon ({form.freon_count})</span><span>${livePrice.freon_fee}</span></div>}
        {livePrice.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({form.stairs})</span><span>${livePrice.stairs_fee}</span></div>}
        {livePrice.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${livePrice.same_day_fee}</span></div>}
        <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>${livePrice.total}</span></div>
        <div className="flex justify-between text-black/50"><span>Deposit</span><span>$50</span></div>
        <div className="flex justify-between text-black/50"><span>Balance on pickup</span><span>${livePrice.balance_due}</span></div>
      </div>

      {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !form.name || !form.phone || !form.address || !form.job_date} className="flex-1 bg-[#f97316] text-white text-sm font-semibold py-2 rounded-lg disabled:bg-[#f97316]/50">
          {submitting ? 'Creating…' : 'Create + send deposit link'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ADD CUSTOM DATE
// ============================================================
function AddCustomDateButton({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [maxJobs, setMaxJobs] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/add-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          times: ['07:30', '09:00', '11:00', '13:00'],
          max_jobs: parseInt(maxJobs),
          day_type: 'custom',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOpen(false);
      setDate('');
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '12px 16px', borderRadius: 12, border: '1px dashed rgba(0,0,0,.2)',
          background: '#fff', color: 'rgba(0,0,0,.55)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        + Day
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-3">
      <h3 className="font-bold text-[#1a1a1a]">Add custom work day</h3>
      <p className="text-xs text-black/50">Opens slots on a specific date (e.g. a Thursday or weekday). Default slots are Sundays only.</p>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      <div>
        <label className="text-xs text-black/50">Max jobs per slot</label>
        <input type="number" min="1" max="10" value={maxJobs} onChange={(e) => setMaxJobs(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-black/40">Slots: 7:30 AM, 9:00 AM, 11:00 AM, 1:00 PM</p>
      {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !date} className="flex-1 bg-[#f97316] text-white text-sm font-semibold py-2 rounded-lg disabled:bg-[#f97316]/50">
          {submitting ? 'Adding…' : 'Add slots'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DAY-OF SUMMARY — shows on operating days at top of Dispatch
// ============================================================
function DayOfSummary({ bookings }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
  const todayName = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton', weekday: 'long'
  });
  const isOperatingDay = ['Thursday', 'Sunday'].includes(todayName);

  if (!isOperatingDay) return null;

  const todayJobs = bookings.filter((b) => b.job_date === today && b.status !== 'cancelled');
  if (todayJobs.length === 0) return null;

  const totalBalance = todayJobs
    .filter((b) => b.status !== 'completed')
    .reduce((s, b) => s + (b.balance_due || 0), 0);
  const completed = todayJobs.filter((b) => b.status === 'completed').length;
  const remaining = todayJobs.filter((b) => b.status !== 'completed').length;

  return (
    <div className="bg-[#f97316] text-white rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">Today — {todayName}</span>
        <span className="text-orange-400 font-bold text-lg">${totalBalance} to collect</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="font-bold text-xl">{todayJobs.length}</div>
          <div className="text-black/40 text-xs">Total jobs</div>
        </div>
        <div>
          <div className="font-bold text-xl text-green-400">{completed}</div>
          <div className="text-black/40 text-xs">Done</div>
        </div>
        <div>
          <div className="font-bold text-xl text-orange-400">{remaining}</div>
          <div className="text-black/40 text-xs">Remaining</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DEPARTURE COUNTDOWN — shows on Earnings tab
// ============================================================
function DepartureCountdown() {
  const departure = new Date('2026-08-27T00:00:00-06:00');
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((departure - now) / (1000 * 60 * 60 * 24)));

  let operatingDays = 0;
  const d = new Date();
  while (d < departure) {
    const dow = d.getDay();
    if (dow === 0 || dow === 4) operatingDays++;
    d.setDate(d.getDate() + 1);
  }

  return (
    <div className="bg-[#f97316] text-white rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="text-2xl font-bold">{daysLeft} days left</div>
        <div className="text-black/40 text-sm">Until departure (Aug 27)</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-orange-400">{operatingDays}</div>
        <div className="text-black/40 text-sm">Operating days left</div>
      </div>
    </div>
  );
}

// ============================================================
// SCHEDULE VIEW — manage slots, toggle availability, add days
// ============================================================
function ScheduleView() {
  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingDate, setAddingDate] = useState('');
  const [addingMax, setAddingMax] = useState(1);
  const [bulkMax, setBulkMax] = useState(1);
  const [showBulk, setShowBulk] = useState(false);

  // Calgary current time for past-slot detection
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
  const currentTimeStr = now.toLocaleTimeString('en-CA', {
    timeZone: 'America/Edmonton',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const load = () => {
    fetch('/api/admin/schedule')
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || []);
        setStats(d.stats || null);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const act = async (body) => {
    await fetch('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  };

  const addDay = async () => {
    if (!addingDate) return;
    await act({ action: 'add_day', slot_date: addingDate, max_jobs: addingMax });
    setAddingDate('');
  };

  const applyBulkMax = async () => {
    if (!window.confirm(`Set ALL future empty slots to ${bulkMax} job/slot? This won't affect already-booked slots.`)) return;
    await act({ action: 'bulk_set_max', max_jobs: bulkMax });
    setShowBulk(false);
  };

  const TIME_LABELS = {
    '07:30': '7:30 AM',
    '09:00': '9:00 AM',
    '11:00': '11:00 AM',
    '13:00': '1:00 PM',
  };

  if (loading) return <p className="text-center text-black/40 py-10">Loading schedule…</p>;

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl border border-black/[0.06] p-3 text-center">
            <div className="text-xl font-bold text-[#1a1a1a]">{stats.operatingDays}</div>
            <div className="text-xs text-black/40">Operating days</div>
          </div>
          <div className="bg-white rounded-xl border border-black/[0.06] p-3 text-center">
            <div className="text-xl font-bold text-[#1a1a1a]">{stats.totalBooked}</div>
            <div className="text-xs text-black/40">Booked</div>
          </div>
          <div className="bg-white rounded-xl border border-black/[0.06] p-3 text-center">
            <div className="text-xl font-bold text-[#1a1a1a]">{stats.totalUpcomingSlots}</div>
            <div className="text-xs text-black/40">Capacity</div>
          </div>
          <div className="bg-white rounded-xl border border-black/[0.06] p-3 text-center">
            <div className={`text-xl font-bold ${stats.fillRate > 70 ? 'text-[#f97316]' : 'text-[#1a1a1a]'}`}>
              {stats.fillRate}%
            </div>
            <div className="text-xs text-black/40">Fill rate</div>
          </div>
        </div>
      )}

      {/* Add operating day */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1a1a1a]">Add operating day</h3>
          <button
            onClick={() => setShowBulk((s) => !s)}
            className="text-xs text-[#f97316] font-medium"
          >
            Bulk update all →
          </button>
        </div>

        {showBulk && (
          <div className="bg-[#f97316]/10 rounded-xl p-3 space-y-2">
            <p className="text-xs text-orange-700 font-medium">
              Set capacity for ALL future empty slots at once. Use this if you add a second crew.
            </p>
            <div className="flex gap-2">
              <select
                value={bulkMax}
                onChange={(e) => setBulkMax(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n} job{n > 1 ? 's' : ''}/slot</option>
                ))}
              </select>
              <button
                onClick={applyBulkMax}
                className="flex-1 bg-[#f97316] text-white text-sm font-semibold py-2 rounded-lg"
              >
                Apply to all future slots
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="date"
            value={addingDate}
            onChange={(e) => setAddingDate(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={addingMax}
            onChange={(e) => setAddingMax(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>{n} job{n > 1 ? 's' : ''}/slot</option>
            ))}
          </select>
          <button
            onClick={addDay}
            disabled={!addingDate}
            className="bg-[#f97316] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:bg-[#f97316]/50"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-black/40">
          Thu/Sun auto-generate 16 weeks rolling every Monday. Stat holidays are blocked automatically.
        </p>
      </div>

      {schedule.length === 0 && (
        <p className="text-center text-black/40 py-10">No upcoming slots in schedule.</p>
      )}

      {schedule.map((day) => {
        const totalBooked = day.slots.reduce((s, sl) => s + sl.jobs_booked, 0);
        const totalMax = day.slots.reduce((s, sl) => s + sl.max_jobs, 0);
        const isFull = totalBooked >= totalMax;
        const allClosed = day.slots.every((sl) => !sl.is_available);
        const isThursday = day.day_type === 'thursday';
        const isSunday = day.day_type === 'sunday';

        return (
          <div key={day.date} className={`bg-white rounded-2xl border p-4 ${isFull ? 'border-[#EF4444]/20' : 'border-black/[0.06]'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#1a1a1a]">
                    {new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-CA', {
                      weekday: 'long', month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    isThursday ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                    isSunday ? 'bg-[#f97316]/10 text-[#f97316]' :
                    'bg-[#F5F5F7] text-black/60'
                  }`}>
                    {day.day_type}
                  </span>
                  {isFull && <span className="text-xs bg-[#EF4444]/10 text-[#EF4444] px-1.5 py-0.5 rounded font-medium">FULL</span>}
                  {allClosed && !isFull && <span className="text-xs bg-gray-100 text-black/50 px-1.5 py-0.5 rounded">Closed</span>}
                </div>
                <div className="text-xs text-black/40 mt-0.5">
                  {totalBooked} / {totalMax} booked
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => act({ action: allClosed ? 'open_day' : 'close_day', slot_date: day.date })}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                    allClosed
                      ? 'border-[#22C55E]/20 text-[#22C55E]'
                      : 'border-black/[0.06] text-black/50'
                  }`}
                >
                  {allClosed ? 'Open all' : 'Close day'}
                </button>
                <button
                  onClick={() => {
                    if (totalBooked > 0) {
                      alert(`Can't remove — ${totalBooked} job(s) already booked on this day.`);
                      return;
                    }
                    if (window.confirm(`Remove all slots for ${day.date}?`))
                      act({ action: 'delete_day', slot_date: day.date });
                  }}
                  className="text-xs text-[#EF4444] border border-[#EF4444]/20 rounded-lg px-2 py-1"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {day.slots.map((slot) => {
                const isPast = slot.slot_date < todayStr ||
                  (slot.slot_date === todayStr && slot.slot_time <= currentTimeStr);
                const pct = slot.max_jobs > 0
                  ? Math.round((slot.jobs_booked / slot.max_jobs) * 100)
                  : 0;
                const slotFull = slot.jobs_booked >= slot.max_jobs;

                return (
                  <div
                    key={slot.slot_time}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-opacity ${
                      isPast
                        ? 'opacity-30 pointer-events-none'
                        : !slot.is_available
                        ? 'bg-[#FAFAFA] opacity-60'
                        : 'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="w-16 flex-shrink-0">
                      <span className="text-sm font-semibold text-black/70">
                        {TIME_LABELS[slot.slot_time] || slot.slot_time}
                      </span>
                      {isPast && (
                        <span className="block text-xs text-black/40">passed</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            slotFull ? 'bg-red-400' :
                            pct > 60 ? 'bg-orange-400' :
                            'bg-green-400'
                          }`}
                          style={{ width: `${Math.max(pct, slotFull ? 100 : 0)}%` }}
                        />
                      </div>
                      <div className="text-xs text-black/40 mt-0.5">
                        {slot.jobs_booked} / {slot.max_jobs} booked
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => act({
                          action: 'set_max',
                          slot_date: slot.slot_date,
                          slot_time: slot.slot_time,
                          max_jobs: Math.max(slot.jobs_booked, slot.max_jobs - 1),
                        })}
                        className="w-6 h-6 rounded border border-black/[0.06] text-sm font-bold text-black/50 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="text-xs font-medium text-black/70 w-4 text-center">
                        {slot.max_jobs}
                      </span>
                      <button
                        onClick={() => act({
                          action: 'set_max',
                          slot_date: slot.slot_date,
                          slot_time: slot.slot_time,
                          max_jobs: slot.max_jobs + 1,
                        })}
                        className="w-6 h-6 rounded border border-black/[0.06] text-sm font-bold text-black/50 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => act({
                        action: 'toggle',
                        slot_date: slot.slot_date,
                        slot_time: slot.slot_time,
                      })}
                      className={`text-xs px-2 py-1 rounded-lg font-medium border flex-shrink-0 ${
                        slot.is_available
                          ? 'border-[#22C55E]/20 text-[#22C55E] bg-[#22C55E]/10'
                          : 'border-black/[0.06] text-black/40 bg-[#FAFAFA]'
                      }`}
                    >
                      {slot.is_available ? 'Open' : 'Closed'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// LEADS VIEW — unconverted leads with full detail panel
// ============================================================
function LeadsView() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    fetch('/api/admin/leads')
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-center text-black/40 py-10">Loading leads…</p>;

  // Group leads by phone so we show one card per person with all their quotes.
  const byPhone = {};
  leads.forEach((l) => {
    if (!byPhone[l.phone]) byPhone[l.phone] = [];
    byPhone[l.phone].push(l);
  });
  const phoneGroups = Object.entries(byPhone).sort((a, b) => {
    const aLatest = Math.max(...a[1].map((l) => new Date(l.created_at).getTime()));
    const bLatest = Math.max(...b[1].map((l) => new Date(l.created_at).getTime()));
    return bLatest - aLatest;
  });

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  // Collect all quotes across sessions for this phone.
  const allQuotes = (sessions) => sessions.flatMap((l) => l.quotes || []);

  // Use the most recent lead session for display fields.
  const latest = (sessions) => sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  // Funnel step labels for display.
  const STEP_LABELS = {
    phone: 'Phone entered',
    address: 'Address entered',
    photos: 'Photos uploaded',
    items: 'Items reviewed',
    load: 'Load size picked',
    schedule: 'Time picked',
    details: 'Details entered',
    payment: 'Payment page',
    done: 'Booking complete',
  };

  const dropoffLabel = (step) => STEP_LABELS[step] || step || 'Unknown';

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/50">{phoneGroups.length} unconverted lead{phoneGroups.length !== 1 ? 's' : ''}</p>
      {phoneGroups.length === 0 && <p className="text-center text-black/40 py-10">No unconverted leads right now.</p>}

      {phoneGroups.map(([phone, sessions]) => {
        const rep = latest(sessions);
        const quotes = allQuotes(sessions);
        const hasPrice = quotes.length > 0 || rep.ai_price_estimate;
        const isExpanded = expanded === phone;

        return (
          <div key={phone} className="bg-white rounded-2xl border border-black/[0.06] p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <a href={`tel:${phone}`} className="text-[#f97316] font-semibold text-sm">{phone}</a>
                {rep.address && (
                  <p className="text-xs text-black/50 mt-0.5">{rep.address}</p>
                )}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {hasPrice ? (
                    <span className="text-xs bg-[#22C55E]/10 text-green-700 rounded px-1.5 py-0.5 font-medium">
                      {quotes.length > 0
                        ? `${quotes.length} quote${quotes.length > 1 ? 's' : ''} — latest $${quotes[0].price}`
                        : `$${rep.ai_price_estimate} quote`}
                    </span>
                  ) : (
                    <span className="text-xs bg-[#F59E0B]/10 text-yellow-700 rounded px-1.5 py-0.5">No photos uploaded</span>
                  )}
                  {rep.load_size && (
                    <span className="text-xs bg-[#F5F5F7] text-black/60 rounded px-1.5 py-0.5 capitalize">{rep.load_size.replace('_', ' ')}</span>
                  )}
                  {rep.last_step_reached && rep.last_step_reached !== 'done' && (
                    <span className="text-xs bg-[#EF4444]/10 text-red-600 rounded px-1.5 py-0.5">
                      Dropped at: {dropoffLabel(rep.last_step_reached)}
                    </span>
                  )}
                  <span className="text-xs text-black/40">{fmtDate(rep.created_at)}</span>
                  {rep.follow_up_sent && <span className="text-xs bg-[#3B82F6]/10 text-[#3B82F6] rounded px-1.5 py-0.5">Followed up</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setExpanded(isExpanded ? null : phone)}
                  className="text-xs text-black/50 hover:text-black/80 font-medium"
                >
                  {isExpanded ? 'Hide' : 'Details'}
                </button>
                <a href={`tel:${phone}`} className="bg-[#f97316] text-white text-xs font-semibold px-3 py-2 rounded-lg">Call</a>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-3 text-xs">
                {/* Quote history */}
                {quotes.length > 0 && (
                  <div>
                    <div className="font-semibold text-black/60 mb-1">Quote history</div>
                    {quotes.map((q, i) => (
                      <div key={i} className="flex justify-between text-black/50 py-0.5">
                        <span>${q.price} — {q.load_size?.replace('_', ' ') || 'unknown'}</span>
                        <span>{fmtDate(q.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Funnel drop-off */}
                {rep.last_step_reached && (
                  <div>
                    <div className="font-semibold text-black/60 mb-1">Funnel</div>
                    <div className="text-black/50">
                      Last step: <span className="font-medium text-black/70">{dropoffLabel(rep.last_step_reached)}</span>
                      {rep.last_step_at && <span className="ml-2">{fmtDate(rep.last_step_at)}</span>}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {rep.photos && rep.photos.length > 0 && (
                  <div>
                    <div className="font-semibold text-black/60 mb-1">Photos ({rep.photos.length})</div>
                    <div className="flex gap-2 flex-wrap">
                      {rep.photos.slice(0, 6).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-black/10" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Itemized breakdown */}
                {rep.description_text && (
                  <div>
                    <div className="font-semibold text-black/60 mb-1">AI item breakdown</div>
                    <div className="text-black/50 whitespace-pre-wrap">
                      {(() => {
                        try {
                          const parsed = JSON.parse(rep.description_text);
                          if (parsed?.items) {
                            return parsed.items.map((it) => `• ${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.name}`).join('\n');
                          }
                          return JSON.stringify(parsed, null, 2).slice(0, 500);
                        } catch {
                          return rep.description_text.slice(0, 500);
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Attribution */}
                <div>
                  <div className="font-semibold text-black/60 mb-1">Attribution</div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">Source: {rep.source || 'web'}</span>
                    {rep.utm_source && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">utm_source: {rep.utm_source}</span>}
                    {rep.utm_medium && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">utm_medium: {rep.utm_medium}</span>}
                    {rep.utm_campaign && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">utm_campaign: {rep.utm_campaign}</span>}
                    {rep.gclid && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">gclid: {rep.gclid.slice(0, 12)}…</span>}
                    {rep.fbclid && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">fbclid: {rep.fbclid.slice(0, 12)}…</span>}
                    {rep.quadrant && <span className="bg-[#F5F5F7] rounded px-1.5 py-0.5">Quadrant: {rep.quadrant}</span>}
                  </div>
                </div>

                {/* Sessions */}
                {sessions.length > 1 && (
                  <div>
                    <div className="font-semibold text-black/60 mb-1">Sessions ({sessions.length})</div>
                    {sessions.map((s, i) => (
                      <div key={i} className="text-black/40 py-0.5">
                        {fmtDate(s.created_at)} — {s.ai_price_estimate ? `$${s.ai_price_estimate}` : 'no quote'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
