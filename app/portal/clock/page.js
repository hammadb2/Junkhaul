'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/clock — mobile-first clock in/out. One tap, no friction.
// Usable standing in a driveway with one hand.
// ============================================================

export default function ClockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [openShift, setOpenShift] = useState(null);
  const [period, setPeriod] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  // Tick every second for live shift duration
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch('/api/employee/shifts');
    if (res.status === 401) { router.push('/portal'); return; }
    const data = await res.json();
    setOpenShift(data.open_shift);
    setPeriod(data.period);
    setLoading(false);
  }, [router]);

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return; }
    const data = await res.json();
    setEmp(data.employee);
  }, [router]);

  useEffect(() => { loadMe(); load(); }, [loadMe, load]);

  const getGPS = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60000 }
      );
    });

  const clockIn = async () => {
    setActionLoading(true); setError('');
    const gps = await getGPS();
    const res = await fetch('/api/employee/clock-in', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gps),
    });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setError(data.error || 'Clock in failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    load();
  };

  const clockOut = async () => {
    setActionLoading(true); setError('');
    const gps = await getGPS();
    const res = await fetch('/api/employee/clock-out', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gps),
    });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setError(data.error || 'Clock out failed'); return; }
    if (navigator.vibrate) navigator.vibrate([50, 40, 50]);
    load();
  };

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-400">Loading…</div>;
  }

  const clockedIn = !!openShift;
  const durationMin = clockedIn ? Math.floor((now - new Date(openShift.clock_in_at).getTime()) / 60000) : 0;
  const hh = Math.floor(durationMin / 60);
  const mm = durationMin % 60;
  const ss = Math.floor((now - new Date(openShift.clock_in_at).getTime()) / 1000) % 60;

  return (
    <main className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-gray-900">{emp?.name || 'Crew'}</div>
          <div className="text-xs text-gray-400">{emp?.email}</div>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => router.push('/portal/schedule')} className="text-orange-600 font-semibold underline">Today</button>
          <button onClick={() => router.push('/portal/documents')} className="text-gray-500 underline">Docs</button>
          <button onClick={() => router.push('/portal/paystubs')} className="text-gray-500 underline">Pay</button>
          <button onClick={logout} className="text-gray-400 underline">Out</button>
        </div>
      </header>

      {/* Big clock button — the whole point */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <button
          onClick={clockedIn ? clockOut : clockIn}
          disabled={actionLoading}
          className={`w-64 h-64 rounded-full text-white font-bold text-3xl shadow-xl active:scale-95 transition disabled:opacity-50 ${
            clockedIn ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {actionLoading ? '…' : clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
        </button>

        {clockedIn && (
          <div className="mt-8 text-center">
            <div className="text-5xl font-mono font-bold text-gray-900 tabular-nums">
              {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-400 mt-1">on shift since {new Date(openShift.clock_in_at).toLocaleTimeString()}</div>
          </div>
        )}

        {!clockedIn && (
          <div className="mt-8 text-center text-gray-400 text-sm">Tap to start your shift</div>
        )}

        {error && <div className="mt-6 text-red-500 text-sm text-center">{error}</div>}
      </div>

      {/* Period summary */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-2">This pay period</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">{period?.total_hours?.toFixed(1) || '0'}</div>
            <div className="text-xs text-gray-400">hours</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{period?.overtime_hours?.toFixed(1) || '0'}</div>
            <div className="text-xs text-gray-400">OT hours</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">${period?.gross?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-gray-400">gross</div>
          </div>
        </div>
      </div>
    </main>
  );
}
