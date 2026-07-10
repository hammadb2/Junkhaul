'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/clock — shift status (read-only).
// Clock in/out is automatic: starts when first job starts,
// stops when last job ends. This page just shows the status.
// ============================================================

export default function ClockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [openShift, setOpenShift] = useState(null);
  const [period, setPeriod] = useState(null);
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
    if (data.employee && !data.employee.onboarded) {
      router.push('/portal/onboard');
    }
  }, [router]);

  useEffect(() => { loadMe(); load(); }, [loadMe, load]);

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-400">Loading…</div>;
  }

  const clockedIn = !!openShift;
  const shiftStart = openShift?.clock_in_at ? new Date(openShift.clock_in_at).getTime() : 0;
  const durationMin = clockedIn ? Math.floor((now - shiftStart) / 60000) : 0;
  const hh = Math.floor(durationMin / 60);
  const mm = durationMin % 60;
  const ss = clockedIn ? Math.floor((now - shiftStart) / 1000) % 60 : 0;

  const periodHours = Number(period?.total_hours || 0);
  const periodOT = Number(period?.overtime_hours || 0);
  const periodGross = Number(period?.gross || 0);

  return (
    <main className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-top">
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

      {/* Shift status */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className={`w-64 h-64 rounded-full flex items-center justify-center shadow-xl ${clockedIn ? 'bg-green-500' : 'bg-gray-300'}`}>
          <div className="text-center text-white">
            {clockedIn ? (
              <>
                <div className="text-4xl font-bold mb-1">ON SHIFT</div>
                <div className="text-sm opacity-80">Auto-tracked</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-1">OFF SHIFT</div>
                <div className="text-sm opacity-80">Start a job to clock in</div>
              </>
            )}
          </div>
        </div>

        {clockedIn && openShift && (
          <div className="mt-8 text-center">
            <div className="text-5xl font-mono font-bold text-gray-900 tabular-nums">
              {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-400 mt-1">on shift since {new Date(openShift.clock_in_at).toLocaleTimeString()}</div>
            <div className="text-xs text-gray-400 mt-2">Clock out is automatic when your last job ends</div>
          </div>
        )}

        {!clockedIn && (
          <div className="mt-8 text-center text-gray-400 text-sm">
            Your shift starts automatically when you begin your first job.
          </div>
        )}

        {error && <div className="mt-6 text-red-500 text-sm text-center">{error}</div>}
      </div>

      {/* Period summary */}
      <div className="bg-white border-t border-gray-200 p-4 safe-bottom">
        <div className="text-xs text-gray-400 mb-2">This pay period</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">{periodHours.toFixed(1)}</div>
            <div className="text-xs text-gray-400">hours</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{periodOT.toFixed(1)}</div>
            <div className="text-xs text-gray-400">OT hours</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">${periodGross.toFixed(2)}</div>
            <div className="text-xs text-gray-400">gross</div>
          </div>
        </div>
      </div>
    </main>
  );
}
