'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// PayrollPanel — wires up:
//   /api/admin/payroll/preview  (POST — calculate without saving)
//   /api/admin/payroll/run      (POST — calculate & persist)
//   /api/admin/payroll/approve  (GET — list runs; POST — approve run)
//   /api/admin/remittance       (GET — list; POST — mark paid)
//   /api/admin/t4s              (GET — list T4 slips by year)
//   /api/admin/employees        (GET — who's clocked in, hours)
// ============================================================

const CARD = 'bg-white rounded-2xl border border-black/[0.06] p-4';
const BTN = 'bg-[#f97316] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:bg-[#f97316]/50';
const BTN_OUTLINE = 'border border-black/[0.1] text-sm font-semibold px-4 py-2 rounded-lg text-black/70';

function fmtMoney(n) {
  return `$${(Number(n) || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-CA', { timeZone: 'America/Edmonton', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtMins(mins) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function PayrollPanel() {
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'runs', label: 'Pay Runs' },
    { id: 'remittance', label: 'Remittances' },
    { id: 't4s', label: 'T4s' },
  ];

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', gap: 4, background: '#F0F0F2', borderRadius: 999, padding: 4, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 13,
              cursor: 'pointer', border: 'none', transition: 'all .15s',
              ...(tab === t.id ? { background: '#f97316', color: '#fff' } : { background: 'transparent', color: 'rgba(0,0,0,.5)' }),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'runs' && <PayRunsTab />}
      {tab === 'remittance' && <RemittanceTab />}
      {tab === 't4s' && <T4sTab />}
    </div>
  );
}

// ============================================================
// OVERVIEW — employees clocked in + period hours + quick run
// ============================================================
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runModal, setRunModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees');
      const d = await res.json();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-center text-black/40 py-10">Loading employees…</p>;
  if (!data) return <p className="text-center text-black/40 py-10">Failed to load.</p>;

  const { employees, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Total employees" value={summary?.total || 0} />
        <MiniStat label="Onboarded" value={summary?.onboarded || 0} color="#22C55E" />
        <MiniStat label="Pending" value={summary?.pending || 0} color="#F59E0B" />
        <MiniStat label="Clocked in now" value={summary?.clocked_in_now || 0} color="#f97316" />
      </div>

      {/* Run payroll button */}
      <div className={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 className="font-semibold text-[#1a1a1a]">Run Payroll</h3>
            <p className="text-xs text-black/40 mt-1">Calculate and create pay stubs for a pay period.</p>
          </div>
          <button onClick={() => setRunModal({})} className={BTN}>+ New Pay Run</button>
        </div>
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <h3 className="font-semibold text-[#1a1a1a]">Employees — this pay period</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-black/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Clocked in</th>
                <th className="text-right px-4 py-2 font-medium">Reg hrs</th>
                <th className="text-right px-4 py-2 font-medium">OT hrs</th>
                <th className="text-right px-4 py-2 font-medium">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#1a1a1a]">{e.name || e.email}</div>
                    <div className="text-xs text-black/40">{e.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'active' || e.status === 'onboarded' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {e.clocked_in ? (
                      <span className="text-xs text-[#f97316] font-medium">
                        ● {fmtMins(e.clock_in_duration_min)} ago
                      </span>
                    ) : (
                      <span className="text-xs text-black/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{e.period?.regular_hours || 0}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{e.period?.overtime_hours || 0}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtMoney(e.period?.gross)}</td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={6} className="text-center text-black/40 py-8">No employees yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {runModal && <RunPayrollModal onClose={() => setRunModal(null)} onDone={load} />}
    </div>
  );
}

// ============================================================
// RUN PAYROLL MODAL — preview then run
// ============================================================
function RunPayrollModal({ onClose, onDone }) {
  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 13 * 86400000).toISOString().slice(0, 10);

  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const doPreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payroll/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Preview failed');
      setPreview(d.pay_run);
    } catch (err) {
      setError(err.message);
    }
    setPreviewing(false);
  };

  const doRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payroll/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Run failed');
      onClose();
      onDone();
    } catch (err) {
      setError(err.message);
    }
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-black/[0.08] w-full max-w-lg max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-black/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-[#1a1a1a]">Run Payroll</h3>
          <button onClick={onClose} className="text-black/40 hover:text-black/70 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-[#EF4444]/10 text-[#EF4444] text-sm rounded-lg p-3">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-black/70">Period start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-black/[0.1] rounded-lg px-3 py-2 text-sm" />
            <label className="text-sm font-medium text-black/70">Period end</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full border border-black/[0.1] rounded-lg px-3 py-2 text-sm" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doPreview} disabled={previewing || !periodStart || !periodEnd} className={BTN_OUTLINE} style={{ flex: 1 }}>
              {previewing ? 'Calculating…' : 'Preview'}
            </button>
          </div>

          {preview && (
            <div className="space-y-3">
              {preview.message ? (
                <p className="text-sm text-black/50 text-center py-4">{preview.message}</p>
              ) : (
                <>
                  <div className="bg-[#F0F0F2] rounded-xl p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-black/50">Gross:</span> <strong>{fmtMoney(preview.totals.total_gross)}</strong></div>
                      <div><span className="text-black/50">Net:</span> <strong className="text-[#22C55E]">{fmtMoney(preview.totals.total_net)}</strong></div>
                      <div><span className="text-black/50">CPP:</span> {fmtMoney(preview.totals.total_cpp)}</div>
                      <div><span className="text-black/50">EI:</span> {fmtMoney(preview.totals.total_ei)}</div>
                      <div><span className="text-black/50">Tax:</span> {fmtMoney(preview.totals.total_fed_tax)}</div>
                      <div><span className="text-black/50">CRA remit:</span> <strong className="text-[#f97316]">{fmtMoney(preview.totals.total_cra_remittance)}</strong></div>
                    </div>
                  </div>

                  <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-black/50">
                        <tr>
                          <th className="text-left px-3 py-2">Employee</th>
                          <th className="text-right px-3 py-2">Hours</th>
                          <th className="text-right px-3 py-2">Gross</th>
                          <th className="text-right px-3 py-2">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.stubs.map((s, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{s.employee_id?.slice(0, 8)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{s.total_hours}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(s.gross_pay)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtMoney(s.net_pay)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={doRun} disabled={running} className={BTN} style={{ width: '100%' }}>
                    {running ? 'Saving pay run…' : 'Confirm & Save Pay Run'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAY RUNS TAB — list past runs, approve them
// ============================================================
function PayRunsTab() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [stubs, setStubs] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payroll/approve');
      const d = await res.json();
      setRuns(d.pay_runs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (runId) => {
    if (!window.confirm('Approve this pay run? This will mark it as approved.')) return;
    setActionLoading(runId);
    try {
      const res = await fetch('/api/admin/payroll/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_run_id: runId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Approve failed');
      load();
    } catch (err) {
      alert(err.message);
    }
    setActionLoading(null);
  };

  const approveWithDeposit = async (runId) => {
    if (!window.confirm('Approve and send direct deposits to all employees?')) return;
    setActionLoading(runId);
    try {
      const res = await fetch('/api/admin/payroll/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_run_id: runId, send_direct_deposit: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      if (d.warning) alert(d.warning);
      load();
    } catch (err) {
      alert(err.message);
    }
    setActionLoading(null);
  };

  if (loading) return <p className="text-center text-black/40 py-10">Loading pay runs…</p>;

  return (
    <div className="space-y-3">
      {runs.length === 0 && <p className="text-center text-black/40 py-10">No pay runs yet. Create one from the Overview tab.</p>}
      {runs.map((run) => (
        <div key={run.id} className={CARD}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#1a1a1a]">
                {fmtDate(run.period_start)} → {fmtDate(run.period_end)}
              </div>
              <div className="text-xs text-black/40 mt-1">
                Net {fmtMoney(run.total_net)} · CRA remit {fmtMoney(run.total_cra_remittance)} · Due {fmtDate(run.remittance_due_date)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                run.status === 'paid' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                run.status === 'approved' ? 'bg-[#3B82F6]/15 text-[#3B82F6]' :
                'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}>
                {run.status}
              </span>
              {run.status === 'calculated' && (
                <>
                  <button onClick={() => approve(run.id)} disabled={actionLoading === run.id}
                    className="text-xs bg-[#f97316] text-white font-semibold px-3 py-1.5 rounded-lg">
                    {actionLoading === run.id ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => approveWithDeposit(run.id)} disabled={actionLoading === run.id}
                    className="text-xs border border-[#f97316] text-[#f97316] font-semibold px-3 py-1.5 rounded-lg">
                    Approve + Deposit
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
            <div><span className="text-black/40">Gross</span> <strong>{fmtMoney(run.total_gross)}</strong></div>
            <div><span className="text-black/40">CPP</span> {fmtMoney(run.total_cpp)}</div>
            <div><span className="text-black/40">EI</span> {fmtMoney(run.total_ei)}</div>
            <div><span className="text-black/40">Tax</span> {fmtMoney(run.total_fed_tax)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// REMITTANCE TAB — CRA remittances, mark as paid
// ============================================================
function RemittanceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/remittance');
      const d = await res.json();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id) => {
    if (!window.confirm('Mark this remittance as paid?')) return;
    setPaying(id);
    try {
      await fetch('/api/admin/remittance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remittance_id: id, paid_method: 'manual' }),
      });
      load();
    } catch { /* ignore */ }
    setPaying(null);
  };

  if (loading) return <p className="text-center text-black/40 py-10">Loading remittances…</p>;
  if (!data) return <p className="text-center text-black/40 py-10">Failed to load.</p>;

  const { remittances, owed_total, owed_count, next_due } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Owed" value={owed_count} color="#EF4444" />
        <MiniStat label="Total owed" value={fmtMoney(owed_total)} color="#EF4444" />
        <MiniStat label="Next due" value={next_due ? fmtDate(next_due.due_date) : '—'} color="#F59E0B" />
      </div>

      {remittances.length === 0 && <p className="text-center text-black/40 py-10">No remittances yet.</p>}

      <div className="space-y-2">
        {remittances.map((r) => (
          <div key={r.id} className={CARD}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#1a1a1a]">{fmtMoney(r.amount)}</div>
                <div className="text-xs text-black/40 mt-1">
                  Due {fmtDate(r.due_date)}
                  {r.pay_runs && ` · Period ${fmtDate(r.pay_runs.period_start)} → ${fmtDate(r.pay_runs.period_end)}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.status === 'paid' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                }`}>
                  {r.status}
                </span>
                {r.status === 'owed' && (
                  <button onClick={() => markPaid(r.id)} disabled={paying === r.id}
                    className="text-xs bg-[#f97316] text-white font-semibold px-3 py-1.5 rounded-lg">
                    {paying === r.id ? '…' : 'Mark paid'}
                  </button>
                )}
              </div>
            </div>
            {r.paid_at && <div className="text-xs text-black/40 mt-2">Paid {fmtDateTime(r.paid_at)} via {r.paid_method || 'manual'}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// T4s TAB — view T4 slips by year
// ============================================================
function T4sTab() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/admin/t4s?year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [year]);

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-black/70">Tax year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border border-black/[0.1] rounded-lg px-3 py-2 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p className="text-center text-black/40 py-10">Loading T4s…</p>}

      {!loading && data && (
        <>
          {data.t4_slips.length === 0 ? (
            <p className="text-center text-black/40 py-10">No T4 slips for {year}.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-black/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Employee</th>
                    <th className="text-right px-4 py-2 font-medium">Box 14 (Gross)</th>
                    <th className="text-right px-4 py-2 font-medium">CPP</th>
                    <th className="text-right px-4 py-2 font-medium">EI</th>
                    <th className="text-right px-4 py-2 font-medium">Tax</th>
                    <th className="text-right px-4 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.t4_slips.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[#1a1a1a]">{s.employees?.name || '—'}</div>
                        <div className="text-xs text-black/40">{s.employees?.email}</div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(s.gross_earnings)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(s.cpp_contributions)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(s.ei_premiums)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(s.income_tax_deducted)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmtMoney(s.net_pay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// MINI STAT
// ============================================================
function MiniStat({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-3">
      <div className="text-xl font-bold" style={{ color: color || '#1a1a1a' }}>{value}</div>
      <div className="text-xs text-black/40 mt-1">{label}</div>
    </div>
  );
}
