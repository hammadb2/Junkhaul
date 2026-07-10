'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, Wallet, LogOut } from 'lucide-react';

// ============================================================
// /portal/clock — shift status (read-only). Light theme.
// ============================================================

export default function ClockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [openShift, setOpenShift] = useState(null);
  const [period, setPeriod] = useState(null);
  const [now, setNow] = useState(Date.now());

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
      <div className="min-h-dvh flex items-center justify-center safe-top" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <span style={{ color: 'rgba(0,0,0,.4)' }}>Loading…</span>
      </div>
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

  const R = 98;
  const C = 2 * Math.PI * R;
  const ringColor = clockedIn ? '#f97316' : '#F0F0F2';
  const ringOffset = clockedIn ? C * 0.35 : C;

  const shiftStartTime = openShift?.clock_in_at
    ? new Date(openShift.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>{emp?.name || 'Crew'}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.5)' }}>{emp?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <HeaderBtn icon={Calendar} onClick={() => router.push('/portal/schedule')} />
          <HeaderBtn icon={FileText} onClick={() => router.push('/portal/documents')} />
          <HeaderBtn icon={Wallet} onClick={() => router.push('/portal/paystubs')} />
          <HeaderBtn icon={LogOut} onClick={logout} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 24 }}>
          <svg width={220} height={220} viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={110} cy={110} r={R} fill="none" stroke="#F0F0F2" strokeWidth={14} />
            <circle cx={110} cy={110} r={R} fill="none" stroke={ringColor} strokeWidth={14} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {clockedIn ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, background: '#22C55E' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#22C55E' }}>ON SHIFT</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                  {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>since {shiftStartTime}</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, background: 'rgba(0,0,0,.2)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(0,0,0,.4)' }}>OFF SHIFT</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'rgba(0,0,0,.4)' }}>00:00:00</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Start a job to clock in</div>
              </>
            )}
          </div>
        </div>

        <div style={{ width: '100%', background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Pay period summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Regular hours</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{periodHours.toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Overtime hours</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{periodOT.toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.06)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Gross pay (est.)</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>${periodGross.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.4)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Clock in/out is automatic based on job activity
        </div>
      </div>
    </div>
  );
}

function HeaderBtn({ icon: Icon, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 34, height: 34, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <Icon size={16} color="#1a1a1a" />
    </div>
  );
}
