'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ChevronDown, ChevronUp, TrendingUp, Calendar, LogOut } from 'lucide-react';

// ============================================================
// /portal/paystubs — employee pay stub history. Light theme.
// ============================================================

export default function PayStubsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stubs, setStubs] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #F0F0F2', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const depositPill = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'sent' || s === 'paid' || s === 'completed') return { label: 'Sent', bg: 'rgba(34,197,94,.15)', color: '#22C55E' };
    if (s === 'failed' || s === 'error') return { label: 'Failed', bg: 'rgba(239,68,68,.15)', color: '#EF4444' };
    return { label: 'Pending', bg: 'rgba(245,158,11,.15)', color: '#F59E0B' };
  };

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div onClick={() => router.push('/portal/schedule')} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Calendar size={17} color="#1a1a1a" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Pay Stubs</div>
        <div onClick={logout} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={17} color="#1a1a1a" />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {stubs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 96 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Wallet size={28} color="rgba(0,0,0,.3)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>No pay stubs yet</div>
            <div style={{ fontSize: 14, color: 'rgba(0,0,0,.5)', textAlign: 'center' }}>Your earnings will appear here once you get paid.</div>
          </div>
        )}

        {stubs.map((s) => {
          const isOpen = expanded === s.id;
          const pill = depositPill(s.direct_deposit_status);
          return (
            <div key={s.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              {/* Collapsed header */}
              <div onClick={() => setExpanded(isOpen ? null : s.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', fontVariantNumeric: 'tabular-nums' }}>
                    {Number(s.total_hours).toFixed(1)} hrs
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(s.net_pay).toFixed(2)}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="rgba(0,0,0,.4)" /> : <ChevronDown size={16} color="rgba(0,0,0,.4)" />}
                </div>
              </div>

              {/* Expanded breakdown */}
              {isOpen && (
                <div style={{ marginTop: 14 }}>
                  {/* Earnings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    <BreakRow label={`Regular · ${Number(s.regular_hours).toFixed(1)} hrs`} value={`$${Number(s.regular_pay).toFixed(2)}`} />
                    <BreakRow label={`Overtime · ${Number(s.overtime_hours).toFixed(1)} hrs`} value={`$${Number(s.overtime_pay).toFixed(2)}`} />
                    <BreakRow label="Vacation (4%)" value={`$${Number(s.vacation_pay).toFixed(2)}`} />
                    <BreakRow label="Gross" value={`$${Number(s.gross_pay).toFixed(2)}`} bold border />
                  </div>

                  {/* Deductions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    <BreakRow label="CPP" value={`-$${Number(s.cpp).toFixed(2)}`} />
                    {Number(s.cpp2) > 0 && <BreakRow label="CPP2" value={`-$${Number(s.cpp2).toFixed(2)}`} />}
                    <BreakRow label="EI" value={`-$${Number(s.ei).toFixed(2)}`} />
                    <BreakRow label="Income tax" value={`-$${Number(s.fed_tax).toFixed(2)}`} />
                  </div>

                  {/* Net pay highlight */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,115,22,.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a' }}>Net pay</span>
                    <span style={{ fontSize: 19, fontWeight: 800, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>${Number(s.net_pay).toFixed(2)}</span>
                  </div>

                  {/* YTD */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <TrendingUp size={14} color="rgba(0,0,0,.5)" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,.5)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Year to date</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'rgba(0,0,0,.6)' }}>
                    <div>Gross: <b style={{ color: '#1a1a1a' }}>${Number(s.ytd_gross).toFixed(0)}</b></div>
                    <div>CPP: <b style={{ color: '#1a1a1a' }}>${Number(s.ytd_cpp).toFixed(0)}</b></div>
                    <div>EI: <b style={{ color: '#1a1a1a' }}>${Number(s.ytd_ei).toFixed(0)}</b></div>
                    <div>Tax: <b style={{ color: '#1a1a1a' }}>${Number(s.ytd_fed_tax).toFixed(0)}</b></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakRow({ label, value, bold, border }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: border ? 8 : 0, borderTop: border ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
      <span style={{ fontSize: 12.5, color: bold ? '#1a1a1a' : 'rgba(0,0,0,.6)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 13.5 : 13, fontWeight: bold ? 700 : 600, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
