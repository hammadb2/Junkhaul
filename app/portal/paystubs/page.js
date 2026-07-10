'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ChevronDown, ChevronUp, TrendingUp, Calendar, LogOut } from 'lucide-react';

// ============================================================
// /portal/paystubs — employee pay stub history.
// Dark theme redesign. Keeps all existing API calls & logic.
// ============================================================

export default function PayStubsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stubs, setStubs] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    // Check onboarding status first
    const meRes = await fetch('/api/employee/me');
    if (meRes.status === 401) { router.push('/portal'); return; }
    const meData = await meRes.json();
    if (meData.employee && !meData.employee.onboarded) {
      router.push('/portal/onboard'); return;
    }
    const res = await fetch('/api/employee/pay-stubs');
    if (res.status === 401) { router.push('/portal'); return; }
    const data = await res.json();
    setStubs(data.pay_stubs || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const logout = async () => { await fetch('/api/employee/logout', { method: 'POST' }); router.push('/portal'); };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  const depositPill = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'sent' || s === 'paid' || s === 'completed') return { label: 'Sent', color: 'var(--status-green)' };
    if (s === 'failed' || s === 'error') return { label: 'Failed', color: 'var(--status-red)' };
    return { label: 'Pending', color: 'var(--status-amber)' };
  };

  return (
    <main className="min-h-dvh safe-top safe-bottom" style={{ background: 'var(--bg-base)' }}>
      {/* Floating glass header */}
      <header className="glass-bar sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Wallet size={20} style={{ color: 'var(--accent)' }} />
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Pay Stubs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/portal/schedule')}
            className="glass-btn w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Today"
          >
            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button
            onClick={logout}
            className="glass-btn w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Log out"
          >
            <LogOut size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 py-5 space-y-3">
        {stubs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-card)' }}>
              <Wallet size={28} style={{ color: 'var(--text-disabled)' }} />
            </div>
            <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No pay stubs yet</div>
            <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Your earnings will appear here once you get paid.</div>
          </div>
        )}

        {stubs.map((s) => {
          const isOpen = expanded === s.id;
          const pill = depositPill(s.direct_deposit_status);
          return (
            <div key={s.id} className="dark-card overflow-hidden fade-in">
              {/* Collapsed header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ color: pill.color, background: `${pill.color}1A` }}
                    >
                      {pill.label}
                    </span>
                  </div>
                  <div className="text-sm tabular" style={{ color: 'var(--text-secondary)' }}>
                    {Number(s.total_hours).toFixed(1)} hrs
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[34px] font-bold tabular leading-none" style={{ color: 'var(--text-primary)' }}>
                      ${Number(s.net_pay).toFixed(2)}
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>net pay</div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} />
                    : <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />}
                </div>
              </button>

              {/* Expanded breakdown */}
              {isOpen && (
                <div className="px-5 pb-5 pt-1 slide-up">
                  <div className="h-px my-2" style={{ background: 'var(--border-subtle)' }} />

                  {/* Earnings */}
                  <SectionLabel>Earnings</SectionLabel>
                  <BreakRow label="Regular pay" sub={`${Number(s.regular_hours).toFixed(1)} hrs`} value={`$${Number(s.regular_pay).toFixed(2)}`} />
                  <BreakRow label="Overtime pay" sub={`${Number(s.overtime_hours).toFixed(1)} hrs`} value={`$${Number(s.overtime_pay).toFixed(2)}`} />
                  <BreakRow label="Vacation pay (4%)" value={`$${Number(s.vacation_pay).toFixed(2)}`} />
                  <BreakRow label="Gross" value={`$${Number(s.gross_pay).toFixed(2)}`} bold />

                  <div className="h-px my-3" style={{ background: 'var(--border-subtle)' }} />

                  {/* Deductions */}
                  <SectionLabel>Deductions</SectionLabel>
                  <BreakRow label="CPP" value={`-$${Number(s.cpp).toFixed(2)}`} />
                  {Number(s.cpp2) > 0 && <BreakRow label="CPP2" value={`-$${Number(s.cpp2).toFixed(2)}`} />}
                  <BreakRow label="EI" value={`-$${Number(s.ei).toFixed(2)}`} />
                  <BreakRow label="Income tax" value={`-$${Number(s.fed_tax).toFixed(2)}`} />

                  <div className="h-px my-3" style={{ background: 'var(--border-subtle)' }} />

                  <BreakRow label="Net pay" value={`$${Number(s.net_pay).toFixed(2)}`} bold />

                  {/* YTD card */}
                  <div className="dark-card mt-4 p-4" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Year to Date</span>
                    </div>
                    <YtdRow label="YTD gross" value={`$${Number(s.ytd_gross).toFixed(2)}`} />
                    <YtdRow label="YTD CPP" value={`$${Number(s.ytd_cpp).toFixed(2)}`} />
                    <YtdRow label="YTD EI" value={`$${Number(s.ytd_ei).toFixed(2)}`} />
                    <YtdRow label="YTD income tax" value={`$${Number(s.ytd_fed_tax).toFixed(2)}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wide mb-2 mt-1" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  );
}

function BreakRow({ label, value, sub, bold }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {sub && <span className="ml-1.5 text-[12px]" style={{ color: 'var(--text-disabled)' }}>({sub})</span>}
      </span>
      <span
        className="text-base tabular"
        style={{ color: bold ? 'var(--text-primary)' : 'var(--text-primary)', fontWeight: bold ? 700 : 400 }}
      >
        {value}
      </span>
    </div>
  );
}

function YtdRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm tabular" style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}
