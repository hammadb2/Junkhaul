'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/paystubs — employee pay stub history.
// ============================================================

export default function PayStubsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stubs, setStubs] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/employee/pay-stubs');
    if (res.status === 401) { router.push('/portal'); return; }
    const data = await res.json();
    setStubs(data.pay_stubs || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const logout = async () => { await fetch('/api/employee/logout', { method: 'POST' }); router.push('/portal'); };

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <main className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0">
        <button onClick={() => router.push('/portal/clock')} className="text-gray-500 text-sm">‹ Clock</button>
        <span className="font-bold text-gray-900">Pay Stubs</span>
        <button onClick={logout} className="text-gray-400 text-sm underline">Out</button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {stubs.length === 0 && (
          <p className="text-gray-400 text-center py-10 text-sm">No pay stubs yet.</p>
        )}
        {stubs.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="w-full px-3 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="font-medium text-gray-900 text-sm">{new Date(s.created_at).toLocaleDateString()}</div>
                <div className="text-xs text-gray-400">{Number(s.total_hours).toFixed(1)} hrs</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">${Number(s.net_pay).toFixed(2)}</div>
                <div className="text-xs text-gray-400">net</div>
              </div>
            </button>
            {expanded === s.id && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-2 text-sm space-y-1">
                <Row label="Regular pay" value={`$${Number(s.regular_pay).toFixed(2)}`} sub={`${Number(s.regular_hours).toFixed(1)} hrs`} />
                <Row label="Overtime pay" value={`$${Number(s.overtime_pay).toFixed(2)}`} sub={`${Number(s.overtime_hours).toFixed(1)} hrs`} />
                <Row label="Gross" value={`$${Number(s.gross_pay).toFixed(2)}`} bold />
                <Row label="Vacation pay (4%)" value={`$${Number(s.vacation_pay).toFixed(2)}`} />
                <div className="border-t border-gray-100 my-1" />
                <Row label="CPP" value={`-$${Number(s.cpp).toFixed(2)}`} />
                {Number(s.cpp2) > 0 && <Row label="CPP2" value={`-$${Number(s.cpp2).toFixed(2)}`} />}
                <Row label="EI" value={`-$${Number(s.ei).toFixed(2)}`} />
                <Row label="Income tax" value={`-$${Number(s.fed_tax).toFixed(2)}`} />
                <div className="border-t border-gray-100 my-1" />
                <Row label="Net pay" value={`$${Number(s.net_pay).toFixed(2)}`} bold />
                <div className="pt-2 text-xs text-gray-400 space-y-0.5">
                  <div>YTD gross: ${Number(s.ytd_gross).toFixed(2)}</div>
                  <div>YTD CPP: ${Number(s.ytd_cpp).toFixed(2)} · YTD EI: ${Number(s.ytd_ei).toFixed(2)}</div>
                  <div>YTD income tax: ${Number(s.ytd_fed_tax).toFixed(2)}</div>
                  <div>Deposit: {s.direct_deposit_status}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function Row({ label, value, sub, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}{sub && <span className="text-gray-300 ml-1">({sub})</span>}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  );
}
