'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/schedule — today's schedule, job list, truck checks,
// end-of-day summary. Mobile-first, one-thumb operation.
// ============================================================

const STATUS_STYLES = {
  confirmed: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // booking_id being toggled
  const [now, setNow] = useState(Date.now());

  // Tick every second for live job timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return null; }
    const d = await res.json();
    setEmp(d.employee);
    return d.employee;
  }, [router]);

  const loadSchedule = useCallback(async () => {
    const res = await fetch('/api/employee/schedule');
    if (res.status === 401) { router.push('/portal'); return; }
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadMe(); loadSchedule(); }, [loadMe, loadSchedule]);

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  const jobClock = async (bookingId, action) => {
    setBusy(bookingId); setError('');
    const res = await fetch('/api/employee/job-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, action }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) { setError(d.error || 'Action failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    loadSchedule();
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-400">Loading…</div>;
  }

  const assignment = data?.assignment || null;
  const partner = data?.partner || null;
  const bookings = data?.bookings || [];
  const openSessions = data?.open_sessions || [];
  const completedSessions = data?.completed_sessions || [];

  const openSessionFor = (bookingId) =>
    openSessions.find((s) => s.booking_id === bookingId);

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // End of day stats
  const jobsCompleted = bookings.filter((b) => b.status === 'completed').length;
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0), 0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);
  const receiptsTotal = 0; // populated if receipts endpoint provides totals

  const fmtDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  return (
    <main className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="font-bold text-gray-900">{emp?.name || 'Crew'}</div>
          <div className="text-xs text-gray-400">{today}</div>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => router.push('/portal/clock')} className="text-gray-500 underline">Clock</button>
          <button onClick={() => router.push('/portal/documents')} className="text-gray-500 underline">Docs</button>
          <button onClick={() => router.push('/portal/paystubs')} className="text-gray-500 underline">Pay</button>
          <button onClick={logout} className="text-gray-400 underline">Out</button>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
        )}

        {/* No assignment */}
        {!assignment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="text-gray-400 text-sm">No assignment scheduled for today.</div>
            <button
              onClick={() => router.push('/portal/clock')}
              className="mt-4 text-orange-600 font-semibold text-sm underline"
            >
              Go to Clock
            </button>
          </div>
        )}

        {/* Assignment card */}
        {assignment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Today&apos;s Assignment</div>
            <div className="text-lg font-bold text-gray-900">{today}</div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Partner</span>
                <span className="text-gray-900 font-medium">
                  {partner ? partner.name || `${partner.first_name || ''} ${partner.last_name || ''}`.trim() : 'Solo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">U-Haul Pickup</span>
                <span className="text-gray-900 font-medium">
                  {assignment.uhaul_location || assignment.pickup_location || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Partner card */}
        {partner && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Partner</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  {partner.name || `${partner.first_name || ''} ${partner.last_name || ''}`.trim()}
                </div>
                {partner.phone && (
                  <a
                    href={`tel:${partner.phone}`}
                    className="text-orange-600 text-sm font-medium"
                  >
                    {partner.phone}
                  </a>
                )}
              </div>
              {partner.phone && (
                <a
                  href={`tel:${partner.phone}`}
                  className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Truck check section */}
        {assignment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Truck Check</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=pickup`)}
                disabled={bookings.length === 0}
                className="bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
              >
                Truck Pickup Check
              </button>
              <button
                onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=return`)}
                disabled={bookings.length === 0}
                className="bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
              >
                Truck Return Check
              </button>
            </div>
          </div>
        )}

        {/* Job list */}
        {assignment && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">
              Jobs ({bookings.length})
            </div>
            <div className="space-y-3">
              {bookings.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                  No jobs scheduled today.
                </div>
              )}
              {bookings.map((b) => {
                const open = openSessionFor(b.id);
                const inProgress = !!open || b.status === 'in_progress';
                const completed = b.status === 'completed';
                const mapsUrl = b.address
                  ? `https://maps.google.com/?q=${encodeURIComponent(b.address)}`
                  : null;
                const items = Array.isArray(b.itemized_items)
                  ? b.itemized_items
                  : (typeof b.itemized_items === 'string'
                      ? (() => { try { return JSON.parse(b.itemized_items); } catch { return []; } })()
                      : []);
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                    {/* Status + time */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">{b.time_slot || 'Time TBD'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="font-bold text-gray-900">{b.name}</div>
                    <div className="mt-1 space-y-1 text-sm">
                      {b.phone && (
                        <a href={`tel:${b.phone}`} className="block text-orange-600 font-medium">
                          {b.phone}
                        </a>
                      )}
                      {b.address && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-gray-700 underline"
                        >
                          {b.address}
                        </a>
                      )}
                    </div>

                    {/* Price + load size */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-gray-400">Total</div>
                        <div className="font-bold text-gray-900">${Number(b.total_price || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Load size</div>
                        <div className="font-medium text-gray-900">{b.load_size || '—'}</div>
                      </div>
                    </div>

                    {/* Itemized items */}
                    {items.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-1">Items</div>
                        <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
                          {items.map((it, i) => (
                            <li key={i}>
                              {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}× ${it.name || it.item || it.description || ''}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notes */}
                    {b.notes && (
                      <div className="mt-3 bg-amber-50 rounded-lg p-2 text-sm text-amber-800">
                        <span className="font-medium">Notes: </span>{b.notes}
                      </div>
                    )}

                    {/* Live timer */}
                    {inProgress && open && (
                      <div className="mt-3 text-center">
                        <div className="text-2xl font-mono font-bold text-amber-600 tabular-nums">
                          {fmtDuration(now - new Date(open.clock_in_at).getTime())}
                        </div>
                        <div className="text-xs text-gray-400">job in progress</div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-4 flex gap-2">
                      {!completed && !inProgress && (
                        <button
                          onClick={() => jobClock(b.id, 'in')}
                          disabled={busy === b.id}
                          className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
                        >
                          {busy === b.id ? '…' : 'Start Job'}
                        </button>
                      )}
                      {inProgress && (
                        <button
                          onClick={() => jobClock(b.id, 'out')}
                          disabled={busy === b.id}
                          className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
                        >
                          {busy === b.id ? '…' : 'End Job'}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/portal/job?booking_id=${b.id}`)}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm"
                      >
                        Job Flow ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* End of day summary */}
        {assignment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">End of Day</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{jobsCompleted}</div>
                <div className="text-xs text-gray-400">jobs done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalHours}</div>
                <div className="text-xs text-gray-400">hours</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">${receiptsTotal.toFixed(2)}</div>
                <div className="text-xs text-gray-400">receipts</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
