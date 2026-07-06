'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import { LOAD_LABELS, calculatePrice } from '@/lib/pricing';
import { formatTime, formatDateLong } from '@/lib/dates';

const RouteMap = dynamic(() => import('@/components/admin/RouteMap'), { ssr: false });

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState('dispatch');
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

  return (
    <main className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Logo className="h-7" />
        <div className="flex items-center gap-3">
          <div className="flex gap-1 text-xs">
            {['dispatch', 'schedule', 'earnings', 'waitlist', 'leads', 'calls'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium ${
                  view === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={logout} className="text-sm text-gray-400 underline">
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {view === 'dispatch' && (
          <>
            <DayOfSummary bookings={bookings} />
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Jobs" value={stats.jobs} />
                <Stat label="Revenue" value={`$${stats.revenue}`} />
                <Stat label="Flagged" value={stats.flagged} accent={stats.flagged > 0} />
                <Stat label="High risk" value={stats.high_risk} accent={stats.high_risk > 0} />
              </div>
            )}

            {loading ? (
              <p className="text-gray-500 text-center py-10">Loading…</p>
            ) : dates.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No upcoming jobs.</p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {dates.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setActiveDate(d);
                        setRouteOrder(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                        activeDate === d ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      {formatDateLong(d)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={optimise}
                  disabled={optimising}
                  className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:bg-orange-300"
                >
                  {optimising ? 'Optimising route…' : '🗺️ Optimise route for this day'}
                </button>

                {routeOrder && routeOrder.length > 0 && (
                  <div className="space-y-2">
                    <RouteMap stops={routeOrder} />
                    {routeSummary && (
                      <div className="bg-white rounded-xl border border-gray-200 p-3 grid grid-cols-4 gap-2 text-center text-xs">
                        <div><div className="font-bold text-gray-900">{routeSummary.jobs}</div><div className="text-gray-400">Jobs</div></div>
                        <div><div className="font-bold text-gray-900">${routeSummary.total_revenue}</div><div className="text-gray-400">Revenue</div></div>
                        <div><div className="font-bold text-gray-900">${routeSummary.total_est_profit}</div><div className="text-gray-400">Est. Profit</div></div>
                        <div><div className="font-bold text-gray-900">{routeSummary.avg_margin}</div><div className="text-gray-400">Margin</div></div>
                      </div>
                    )}
                    <ol className="bg-white rounded-xl border border-gray-200 divide-y">
                      {routeOrder.map((s) => (
                        <li key={s.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                            {s.position}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-gray-400">{s.quadrant}</span>
                            </div>
                            <div className="text-xs text-gray-500">{s.address}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${s.total_price}</div>
                            {s.est_profit !== undefined && (
                              <div className="text-xs text-green-600">~${s.est_profit} profit</div>
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

            <ManualBookingButton onCreated={load} />
            <AddCustomDateButton onAdded={load} />
          </>
        )}

        {view === 'schedule' && <ScheduleView />}
        {view === 'earnings' && <EarningsDashboard />}
        {view === 'waitlist' && <WaitlistView />}
        {view === 'leads' && <LeadsView />}
        {view === 'calls' && <CallHistoryView />}
      </div>
    </main>
  );
}

// ============================================================
// STAT
// ============================================================
function Stat({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

// ============================================================
// CREW PHOTO CAPTURE — before/after documentation flow
// ============================================================
function CrewPhotoCapture({ booking, onCompleteStateChange }) {
  const [arrived, setArrived] = useState(!!booking.crew_arrived_at);
  const [jobStarted, setJobStarted] = useState(false);
  const [arrivalPhotos, setArrivalPhotos] = useState([]);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [markingArrived, setMarkingArrived] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState(null);

  // Hydrate from any crew_photos already on the booking
  useEffect(() => {
    const photos = Array.isArray(booking.crew_photos) ? booking.crew_photos : [];
    const arrival = photos.filter((p) => p.type === 'crew_arrival').map((p) => p.url);
    const completion = photos.filter((p) => p.type === 'crew_completion').map((p) => p.url);
    setArrivalPhotos(arrival);
    setCompletionPhotos(completion);
    // If we already have 3+ arrival photos, treat the job as started
    if (arrival.length >= 3) setJobStarted(true);
  }, [booking.crew_photos]);

  const arrivalComplete = arrivalPhotos.length >= 3;
  const completionComplete = completionPhotos.length >= 3;
  const canCompleteJob = arrivalComplete && completionComplete;

  // Notify parent whenever completion readiness changes
  useEffect(() => {
    if (onCompleteStateChange) onCompleteStateChange(canCompleteJob);
  }, [canCompleteJob, onCompleteStateChange]);

  const markArrived = async () => {
    setMarkingArrived(true);
    const res = await fetch('/api/admin/mark-arrived', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setArrived(true);
    } else {
      alert(data.error || 'Failed to mark arrived');
    }
    setMarkingArrived(false);
  };

  const uploadPhoto = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('booking_id', booking.id);
    formData.append('type', type);
    try {
      const res = await fetch('/api/admin/upload-crew-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (type === 'crew_arrival') {
          setArrivalPhotos((prev) => [...prev, data.url]);
        } else {
          setCompletionPhotos((prev) => [...prev, data.url]);
        }
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const PhotoThumbs = ({ photos, label }) => (
    <>
      {photos.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">{label} ({photos.length})</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {photos.map((url, i) => (
              <button key={i} onClick={() => setPhotoLightbox(url)} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={label} className="h-16 w-16 rounded-lg object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-900">📸 Crew Photo Documentation</span>
        {arrived && (
          <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">
            On site
          </span>
        )}
      </div>

      {/* Step 1: Mark arrived */}
      {!arrived ? (
        <button
          onClick={markArrived}
          disabled={markingArrived}
          className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:bg-blue-300"
        >
          {markingArrived ? 'Marking…' : '📍 Mark arrived on site'}
        </button>
      ) : (
        <>
          {/* Step 2: Arrival photos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-700">
                Arrival photos {arrivalPhotos.length}/3
              </p>
              {arrivalComplete && (
                <span className="text-xs text-green-600 font-medium">✓ Minimum met</span>
              )}
            </div>
            <PhotoThumbs photos={arrivalPhotos} label="Arrival photos" />
            <label className="mt-2 flex items-center justify-center w-full border-2 border-dashed border-blue-300 rounded-lg py-3 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-100 transition-colors">
              {uploading ? 'Uploading…' : '📷 Take / upload arrival photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => uploadPhoto(e, 'crew_arrival')}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Step 3: Start the job (requires 3 arrival photos) */}
          {arrivalComplete && !jobStarted && (
            <button
              onClick={() => setJobStarted(true)}
              className="w-full bg-orange-500 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              ▶ Start the job
            </button>
          )}
          {!arrivalComplete && (
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
              ⚠️ Take at least {3 - arrivalPhotos.length} more arrival photo{3 - arrivalPhotos.length > 1 ? 's' : ''} before starting the job.
            </p>
          )}

          {/* Step 4: Completion photos (after job started) */}
          {jobStarted && (
            <div className="border-t border-blue-200 pt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-700">
                  Completion photos {completionPhotos.length}/3
                </p>
                {completionComplete && (
                  <span className="text-xs text-green-600 font-medium">✓ Minimum met</span>
                )}
              </div>
              <PhotoThumbs photos={completionPhotos} label="Completion photos" />
              <label className="mt-2 flex items-center justify-center w-full border-2 border-dashed border-blue-300 rounded-lg py-3 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-100 transition-colors">
                {uploading ? 'Uploading…' : '📷 Take / upload completion photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => uploadPhoto(e, 'crew_completion')}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {!completionComplete && (
                <p className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                  ⚠️ Take at least {3 - completionPhotos.length} more completion photo{3 - completionPhotos.length > 1 ? 's' : ''} before marking the job complete.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Lightbox for crew photos */}
      {photoLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoLightbox} alt="crew photo" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
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
  const [canComplete, setCanComplete] = useState(false);
  const done = b.status === 'completed';
  const isNoShow = b.status === 'no_show';
  const isConfirmed = b.status === 'confirmed';

  const loadRescheduleSlots = async (date) => {
    setRescheduleDate(date);
    if (!date) return;
    const res = await fetch('/api/slots');
    const data = await res.json();
    const day = (data.days || []).find((d) => d.date === date);
    setRescheduleSlots(day?.slots || []);
  };

  return (
    <div className={`bg-white rounded-2xl border p-4 ${
      b.flag_for_review ? 'border-orange-300' :
      isNoShow ? 'border-gray-300' :
      'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{b.name}</span>
            {b.quadrant && <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{b.quadrant}</span>}
            {b.source && b.source !== 'web' && (
              <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 capitalize">{b.source}</span>
            )}
            {!b.deposit_paid && (
              <span className="text-xs bg-red-50 text-red-600 rounded px-1.5 py-0.5">⚠️ No deposit</span>
            )}
            {done && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">Done</span>}
            {isNoShow && <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">No-show</span>}
          </div>
          <a href={`tel:${b.phone}`} className="text-sm text-orange-600">{b.phone}</a>
          <p className="text-sm text-gray-500">{b.address}</p>
        </div>
        <div className="text-right">
          <div className="font-bold">{formatTime(b.job_time)}</div>
          <div className="text-sm text-gray-500">{LOAD_LABELS[b.load_size]}</div>
          <div className="text-sm font-semibold">${b.total_price}</div>
        </div>
      </div>

      {/* Flags */}
      {b.flag_for_review && (
        <p className="mt-2 text-xs text-orange-700 bg-orange-50 rounded p-2">
          🚨 {b.flag_reason || 'Flagged for review'}
        </p>
      )}
      {b.has_freon && <p className="mt-1 text-xs text-blue-700">🌡️ Freon appliance ({b.freon_count || 1}), bring straps</p>}
      {(b.no_show_risk_score || 0) >= 50 && (
        <p className="mt-1 text-xs text-red-600">⚠️ No-show risk {b.no_show_risk_score}%</p>
      )}

      {/* Booking notes (from customer at booking time) */}
      {b.description_text && (
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
          📋 {b.description_text}
        </p>
      )}

      {/* Customer notes (new field) */}
      {b.customer_notes && (
        <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
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

      {/* Crew photo documentation (confirmed bookings only) */}
      {isConfirmed && <CrewPhotoCapture booking={b} onCompleteStateChange={setCanComplete} />}

      {/* Operator notes */}
      <OperatorNotes bookingId={b.id} initial={b.operator_notes} />

      {/* Action buttons */}
      {!done && !isNoShow && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              if (isConfirmed && !canComplete) {
                alert('Cannot mark complete — need at least 3 arrival photos and 3 completion photos.');
                return;
              }
              act('complete', { booking_id: b.id }, `Mark ${b.name}'s job as complete and collect $${b.balance_due} balance?`);
            }}
            disabled={isConfirmed && !canComplete}
            className={`flex-1 text-white text-sm font-semibold py-2 rounded-lg ${
              isConfirmed && !canComplete ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600'
            }`}
          >
            {isConfirmed && !canComplete ? '🔒 Photos required' : '✓ Complete'}
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
              className="border border-red-300 text-red-600 text-sm py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => act('no-show', { booking_id: b.id }, `Mark ${b.name} as a no-show?`)}
              className="border border-orange-300 text-orange-600 text-sm py-2 rounded-lg"
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
          <QuickSMS bookingId={b.id} phone={b.phone} name={b.name} />
        </div>
      )}

      {/* Inline reschedule UI */}
      {rescheduling && !done && !isNoShow && (
        <div className="mt-3 space-y-2 border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600">Reschedule to:</p>
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
                    rescheduleTime === s.time ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
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
              className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg"
            >
              Confirm reschedule
            </button>
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
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs h-14 resize-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs text-orange-600 font-medium"
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
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs h-14 resize-none"
      />
      <button
        onClick={send}
        disabled={sending || !msg.trim()}
        className="w-full bg-gray-800 text-white text-sm py-2 rounded-lg font-medium disabled:bg-gray-300"
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
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <p className="text-center text-gray-400 py-10">Loading earnings…</p>;
  if (!data) return null;

  const sources = Object.entries(data.sourceBreakdown || {}).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-4">
      <DepartureCountdown />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">${data.totalEarned.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Total earned</div>
          <div className="text-xs text-gray-400">{data.completedJobs} jobs completed</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">${data.totalPipeline.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">In pipeline</div>
          <div className="text-xs text-gray-400">{data.upcomingJobs} confirmed upcoming</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">${data.avgJobValue}</div>
          <div className="text-sm text-gray-500 mt-1">Avg job value</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            ${(data.totalEarned + data.totalPipeline).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">Total + pipeline</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Where bookings come from</h3>
        <div className="space-y-2">
          {sources.map(([source, stats]) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium text-gray-800">{source}</span>
                <span className="text-gray-400">{stats.count} jobs</span>
              </div>
              <span className="font-semibold text-gray-700">${stats.revenue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Revenue by work day</h3>
        <div className="space-y-2">
          {Object.entries(data.byDate).map(([date, stats]) => (
            <div key={date} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{date}</span>
              <div className="flex gap-3">
                <span className="text-gray-400">{stats.jobs} jobs</span>
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

  if (loading) return <p className="text-center text-gray-400 py-10">Loading waitlist…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{list.length} {list.length === 1 ? 'person' : 'people'} waiting for a slot</p>
      {list.length === 0 && (
        <p className="text-center text-gray-400 py-10">Waitlist is empty.</p>
      )}
      {list.map((entry) => (
        <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{entry.name}</p>
              <a href={`tel:${entry.phone}`} className="text-sm text-orange-600">{entry.phone}</a>
              {entry.address && <p className="text-xs text-gray-500 mt-0.5">{entry.address}</p>}
              <div className="flex gap-2 mt-1 flex-wrap">
                {entry.preferred_day_type && (
                  <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 capitalize">{entry.preferred_day_type}</span>
                )}
                {entry.load_size && (
                  <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 capitalize">{entry.load_size}</span>
                )}
                <span className="text-xs text-gray-400">
                  Joined {new Date(entry.created_at).toLocaleDateString()}
                </span>
                {entry.notified && (
                  <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">Notified</span>
                )}
              </div>
            </div>
            <button
              onClick={() => notify(entry)}
              className="bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-lg ml-3 flex-shrink-0"
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
    name: '', phone: '', email: '', address: '', unit: '',
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
      setForm({ name: '', phone: '', email: '', address: '', unit: '', load_size: 'quarter', job_date: '', job_time: '09:00', same_day: false, stairs: 0, has_freon: false, freon_count: 0, notes: '' });
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
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-600"
      >
        + Add manual booking
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
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-bold text-gray-900">Manual booking</h3>

      <div className="space-y-2">
        <input value={form.name} onChange={set('name')} placeholder="Customer name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.phone} onChange={set('phone')} placeholder="Phone (+1...)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.email} onChange={set('email')} placeholder="Email (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.address} onChange={set('address')} placeholder="Pickup address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
              className={`px-2 py-1 rounded text-xs ${form.job_time === s.time ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <input type="time" value={form.job_time} onChange={set('job_time')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Freon appliances ($40 each)</label>
          <input type="number" min="0" max="10" value={form.freon_count} onChange={set('freon_count')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Stairs (flights, $25 each)</label>
          <input type="number" min="0" max="10" value={form.stairs} onChange={set('stairs')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.same_day} onChange={setBool('same_day')} className="w-4 h-4 rounded" />
        Same-day pickup (+$50)
      </label>

      <textarea value={form.notes} onChange={set('notes')} placeholder="Internal notes (optional, not sent to customer)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16" />

      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span>Base ({LOAD_LABELS[form.load_size]})</span><span>${livePrice.base_price}</span></div>
        {livePrice.freon_fee > 0 && <div className="flex justify-between"><span>Freon ({form.freon_count})</span><span>${livePrice.freon_fee}</span></div>}
        {livePrice.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({form.stairs})</span><span>${livePrice.stairs_fee}</span></div>}
        {livePrice.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${livePrice.same_day_fee}</span></div>}
        <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>${livePrice.total}</span></div>
        <div className="flex justify-between text-gray-500"><span>Deposit</span><span>$50</span></div>
        <div className="flex justify-between text-gray-500"><span>Balance on pickup</span><span>${livePrice.balance_due}</span></div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !form.name || !form.phone || !form.address || !form.job_date} className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg disabled:bg-orange-300">
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
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-600"
      >
        + Add custom work day
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-bold text-gray-900">Add custom work day</h3>
      <p className="text-xs text-gray-500">Opens slots on a specific date (e.g. a Thursday or weekday). Default slots are Sundays only.</p>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      <div>
        <label className="text-xs text-gray-500">Max jobs per slot</label>
        <input type="number" min="1" max="10" value={maxJobs} onChange={(e) => setMaxJobs(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-gray-400">Slots: 7:30 AM, 9:00 AM, 11:00 AM, 1:00 PM</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !date} className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg disabled:bg-orange-300">
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
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">Today — {todayName}</span>
        <span className="text-orange-400 font-bold text-lg">${totalBalance} to collect</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="font-bold text-xl">{todayJobs.length}</div>
          <div className="text-gray-400 text-xs">Total jobs</div>
        </div>
        <div>
          <div className="font-bold text-xl text-green-400">{completed}</div>
          <div className="text-gray-400 text-xs">Done</div>
        </div>
        <div>
          <div className="font-bold text-xl text-orange-400">{remaining}</div>
          <div className="text-gray-400 text-xs">Remaining</div>
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
    <div className="bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="text-2xl font-bold">{daysLeft} days left</div>
        <div className="text-gray-400 text-sm">Until departure (Aug 27)</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-orange-400">{operatingDays}</div>
        <div className="text-gray-400 text-sm">Operating days left</div>
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

  if (loading) return <p className="text-center text-gray-400 py-10">Loading schedule…</p>;

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{stats.operatingDays}</div>
            <div className="text-xs text-gray-400">Operating days</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{stats.totalBooked}</div>
            <div className="text-xs text-gray-400">Booked</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{stats.totalUpcomingSlots}</div>
            <div className="text-xs text-gray-400">Capacity</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className={`text-xl font-bold ${stats.fillRate > 70 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.fillRate}%
            </div>
            <div className="text-xs text-gray-400">Fill rate</div>
          </div>
        </div>
      )}

      {/* Add operating day */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add operating day</h3>
          <button
            onClick={() => setShowBulk((s) => !s)}
            className="text-xs text-orange-600 font-medium"
          >
            Bulk update all →
          </button>
        </div>

        {showBulk && (
          <div className="bg-orange-50 rounded-xl p-3 space-y-2">
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
                className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg"
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
            className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:bg-orange-300"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Thu/Sun auto-generate 16 weeks rolling every Monday. Stat holidays are blocked automatically.
        </p>
      </div>

      {schedule.length === 0 && (
        <p className="text-center text-gray-400 py-10">No upcoming slots in schedule.</p>
      )}

      {schedule.map((day) => {
        const totalBooked = day.slots.reduce((s, sl) => s + sl.jobs_booked, 0);
        const totalMax = day.slots.reduce((s, sl) => s + sl.max_jobs, 0);
        const isFull = totalBooked >= totalMax;
        const allClosed = day.slots.every((sl) => !sl.is_available);
        const isThursday = day.day_type === 'thursday';
        const isSunday = day.day_type === 'sunday';

        return (
          <div key={day.date} className={`bg-white rounded-2xl border p-4 ${isFull ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">
                    {new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-CA', {
                      weekday: 'long', month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    isThursday ? 'bg-blue-50 text-blue-600' :
                    isSunday ? 'bg-orange-50 text-orange-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {day.day_type}
                  </span>
                  {isFull && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">FULL</span>}
                  {allClosed && !isFull && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Closed</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {totalBooked} / {totalMax} booked
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => act({ action: allClosed ? 'open_day' : 'close_day', slot_date: day.date })}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                    allClosed
                      ? 'border-green-200 text-green-600'
                      : 'border-gray-200 text-gray-500'
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
                  className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1"
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
                        ? 'bg-gray-50 opacity-60'
                        : 'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="w-16 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">
                        {TIME_LABELS[slot.slot_time] || slot.slot_time}
                      </span>
                      {isPast && (
                        <span className="block text-xs text-gray-400">passed</span>
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
                      <div className="text-xs text-gray-400 mt-0.5">
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
                        className="w-6 h-6 rounded border border-gray-200 text-sm font-bold text-gray-500 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="text-xs font-medium text-gray-700 w-4 text-center">
                        {slot.max_jobs}
                      </span>
                      <button
                        onClick={() => act({
                          action: 'set_max',
                          slot_date: slot.slot_date,
                          slot_time: slot.slot_time,
                          max_jobs: slot.max_jobs + 1,
                        })}
                        className="w-6 h-6 rounded border border-gray-200 text-sm font-bold text-gray-500 flex items-center justify-center"
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
                          ? 'border-green-200 text-green-600 bg-green-50'
                          : 'border-gray-200 text-gray-400 bg-gray-50'
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
// LEADS VIEW — unconverted leads who got a price but didn't book
// ============================================================
function LeadsView() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/admin/leads')
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-center text-gray-400 py-10">Loading leads…</p>;

  const withPrice = leads.filter((l) => l.ai_price_estimate);
  const withoutPrice = leads.filter((l) => !l.ai_price_estimate);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{leads.length} unconverted lead{leads.length !== 1 ? 's' : ''}</p>
      {leads.length === 0 && <p className="text-center text-gray-400 py-10">No unconverted leads right now.</p>}

      {withPrice.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Got a price — didn&apos;t book</p>
          {withPrice.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <a href={`tel:${lead.phone}`} className="text-orange-600 font-semibold text-sm">{lead.phone}</a>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5 font-medium">${lead.ai_price_estimate} quote</span>
                    {lead.load_size && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 capitalize">{lead.load_size.replace('_', ' ')}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {lead.follow_up_sent && <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">Followed up</span>}
                  </div>
                </div>
                <a href={`tel:${lead.phone}`} className="bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0">Call</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutPrice.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entered phone — no price yet</p>
          {withoutPrice.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <a href={`tel:${lead.phone}`} className="text-orange-600 font-semibold text-sm">{lead.phone}</a>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-yellow-50 text-yellow-700 rounded px-1.5 py-0.5">No photos uploaded</span>
                    <span className="text-xs text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <a href={`tel:${lead.phone}`} className="bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0">Call</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CALL HISTORY VIEW — recent calls with transcript expand
// ============================================================
const SENTIMENT_STYLES = {
  positive: 'bg-green-50 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
  frustrated: 'bg-orange-50 text-orange-700',
  angry: 'bg-red-50 text-red-700',
};

const OUTCOME_LABELS = {
  booking_completed: 'Booking completed',
  quote_given_no_booking: 'Quote — no booking',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  refund_issued: 'Refund issued',
  complaint_logged: 'Complaint logged',
  frustrated_hangup: 'Frustrated hangup',
  no_resolution: 'No resolution',
  transferred: 'Transferred',
};

function CallHistoryView() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback((phone) => {
    setLoading(true);
    const url = phone
      ? `/api/admin/call-history?phone=${encodeURIComponent(phone)}`
      : '/api/admin/call-history';
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setCalls(d.calls || []); setLoading(false); });
  }, []);

  useEffect(() => { load(''); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load(phoneFilter);
  };

  const formatCallDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-CA', {
      timeZone: 'America/Edmonton',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="tel"
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          placeholder="Filter by phone number…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Filter
        </button>
        {phoneFilter && (
          <button
            type="button"
            onClick={() => { setPhoneFilter(''); load(''); }}
            className="border border-gray-300 text-sm px-3 py-2 rounded-lg"
          >
            Clear
          </button>
        )}
      </form>

      <p className="text-sm text-gray-500">{calls.length} call{calls.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <p className="text-center text-gray-400 py-10">Loading call history…</p>
      ) : calls.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No calls found.</p>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <div key={call.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              {/* Header row */}
              <button
                onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`tel:${call.caller_number}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-orange-600 font-semibold text-sm"
                      >
                        {call.caller_name || call.caller_number}
                      </a>
                      {call.caller_name && (
                        <span className="text-xs text-gray-400">{call.caller_number}</span>
                      )}
                      {call.agent_name && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                          {call.agent_name}
                        </span>
                      )}
                    </div>
                    {call.call_summary && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{call.call_summary}</p>
                    )}
                    <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                      <span className="text-xs text-gray-400">{formatCallDate(call.call_date)}</span>
                      <span className="text-xs text-gray-400">· {formatDuration(call.duration_seconds)}</span>
                      {call.call_outcome && (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 font-medium">
                          {OUTCOME_LABELS[call.call_outcome] || call.call_outcome}
                        </span>
                      )}
                      {call.sentiment && (
                        <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${SENTIMENT_STYLES[call.sentiment] || SENTIMENT_STYLES.neutral}`}>
                          {call.sentiment}
                        </span>
                      )}
                      {call.booking_ref && (
                        <span className="text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5 font-medium">
                          {call.booking_ref}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {expandedId === call.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded transcript */}
              {expandedId === call.id && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                  {call.ended_reason && (
                    <p className="text-xs text-gray-400">Ended: {call.ended_reason}</p>
                  )}
                  {call.transcript ? (
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto">
                      {call.transcript}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No transcript available</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
