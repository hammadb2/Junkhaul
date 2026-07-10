'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Wallet, LogOut } from 'lucide-react';

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
    return (
      <main className="min-h-dvh flex items-center justify-center safe-top" style={{ background: '#0A0A0B' }}>
        <span style={{ color: 'rgba(255,255,255,0.40)' }}>Loading…</span>
      </main>
    );
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

  // Ring geometry
  const R = 112; // radius
  const C = 2 * Math.PI * R; // circumference
  const ringColor = clockedIn ? '#22C55E' : '#6B7280';

  return (
    <main className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#0A0A0B' }}>
      {/* Floating glass header bar */}
      <header className="glass-bar sticky top-0 z-20 mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="status-dot flex-shrink-0" style={{ background: clockedIn ? '#22C55E' : '#6B7280' }} />
          <div className="min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'rgba(255,255,255,0.90)' }}>{emp?.name || 'Crew'}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{emp?.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <HeaderBtn icon={Clock} label="Today" onClick={() => router.push('/portal/schedule')} />
          <HeaderBtn icon={FileText} label="Docs" onClick={() => router.push('/portal/documents')} />
          <HeaderBtn icon={Wallet} label="Pay" onClick={() => router.push('/portal/paystubs')} />
          <HeaderBtn icon={LogOut} label="Logout" onClick={logout} />
        </div>
      </header>

      {/* Ring + timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="relative" style={{ width: 240, height: 240 }}>
          <svg width={240} height={240} className="absolute inset-0">
            {/* Track */}
            <circle cx={120} cy={120} r={R} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
            {/* Progress ring */}
            <circle cx={120} cy={120} r={R} fill="none"
              stroke={ringColor} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={clockedIn ? 0 : C}
              transform="rotate(-90 120 120)"
              style={{
                transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease',
                filter: clockedIn ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' : 'none',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {clockedIn ? (
              <>
                <div className="tabular font-bold" style={{ fontSize: 34, color: 'rgba(255,255,255,0.90)', lineHeight: 1.1 }}>
                  {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </div>
                <div className="mt-2 text-xs font-semibold tracking-wide" style={{ color: '#22C55E' }}>ON SHIFT</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.60)' }}>OFF SHIFT</div>
                <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Start a job to clock in</div>
              </>
            )}
          </div>
        </div>

        {clockedIn && openShift && (
          <div className="mt-6 text-center">
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>
              on shift since {new Date(openShift.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {error && <div className="mt-6 text-sm text-center" style={{ color: '#EF4444' }}>{error}</div>}
      </div>

      {/* Pay period card */}
      <div className="px-6 pb-4">
        <div className="dark-card p-5">
          <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.60)' }}>This Pay Period</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatBlock value={periodHours.toFixed(1)} label="hours" />
            <StatBlock value={periodOT.toFixed(1)} label="OT hours" />
            <StatBlock value={`$${periodGross.toFixed(2)}`} label="gross" />
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-6 pb-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
        Clock in/out is automatic — it starts when your first job begins and ends when your last job ends.
      </div>
    </main>
  );
}

function HeaderBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="glass-btn flex items-center justify-center rounded-full"
      style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.60)' }}>
      <Icon size={18} />
    </button>
  );
}

function StatBlock({ value, label }) {
  return (
    <div>
      <div className="tabular font-bold" style={{ fontSize: 34, color: 'rgba(255,255,255,0.90)', lineHeight: 1.1 }}>{value}</div>
      <div className="mt-1" style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)' }}>{label}</div>
    </div>
  );
}
