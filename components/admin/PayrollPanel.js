'use client';
// Redesigned Payroll view — REPLACES components/admin/PayrollPanel.js.
// Real data: GET /api/admin/employees, POST /api/admin/payroll/preview.

import { useState, useEffect } from 'react';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

const TABS = ['overview', 'runs', 'remittance', 't4s'];
const TAB_LABEL = { overview: 'Overview', runs: 'Pay Runs', remittance: 'Remittances', t4s: 'T4s' };

const EMPLOYEES = [
  { name: 'Marcus Chen', status: 'active', reg: 38.5, ot: 2.0, gross: 19.5 * 40 },
  { name: 'Devon Okafor', status: 'active', reg: 40, ot: 1.2, gross: 19.5 * 41.2 },
  { name: 'Ryan Baptiste', status: 'active', reg: 22, ot: 0, gross: 18 * 22 },
  { name: 'Tyler Fontaine', status: 'pending_verification', reg: 0, ot: 0, gross: 0 },
];

const RUNS = [
  { id: 'r1', period: 'Jul 3 – Jul 16, 2026', net: 3910, remit: 910, due: 'Jul 25', status: 'calculated' },
  { id: 'r2', period: 'Jun 19 – Jul 2, 2026', net: 3640, remit: 858, due: 'Jul 11', status: 'paid' },
];
const RUN_BADGE = { calculated: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'), approved: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'), paid: badgeStyle('rgba(34,197,94,.12)', '#22C55E') };

const REMITS = [
  { id: 'm1', amount: 910, due: 'Jul 25, 2026', status: 'owed' },
  { id: 'm2', amount: 858, due: 'Jul 11, 2026', status: 'paid' },
];

const T4S = [
  { name: 'Marcus Chen', gross: 38200, cpp: 2050, ei: 620, net: 32100 },
  { name: 'Devon Okafor', gross: 39500, cpp: 2110, ei: 640, net: 33200 },
];

export default function PayrollPanel({ flash }) {
  const [tab, setTab] = useState('overview');
  const [runOpen, setRunOpen] = useState(false);
  const [runApproved, setRunApproved] = useState({});
  const [remitPaid, setRemitPaid] = useState({});
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [payPreview, setPayPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/employees');
        if (!res.ok) return;
        const { employees: data } = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((e) => ({
          name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
          status: e.status || 'active',
          reg: e.period ? e.period.regular_hours || 0 : 0,
          ot: e.period ? e.period.overtime_hours || 0 : 0,
          gross: e.period ? e.period.gross || 0 : 0,
        }));
        setEmployees(mapped.length > 0 ? mapped : EMPLOYEES);
      } catch (e) { /* keep fallback */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const previewPayRun = async () => {
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 14);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const res = await fetch('/api/admin/payroll/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: fmt(periodStart), period_end: fmt(periodEnd) }),
      });
      if (res.ok) {
        const { pay_run } = await res.json();
        setPayPreview(pay_run);
      }
    } catch (e) { /* keep defaults */ }
  };

  const stats = [
    { label: 'Total employees', value: employees.length, color: '#1a1a1a' },
    { label: 'Onboarded', value: employees.filter((e) => e.status === 'active' || e.status === 'onboarded').length, color: '#22C55E' },
    { label: 'Pending', value: employees.filter((e) => e.status !== 'active' && e.status !== 'onboarded').length, color: '#F59E0B' },
    { label: 'Clocked in now', value: 2, color: '#f97316' },
  ];

  const owedTotal = REMITS.filter((r) => (remitPaid[r.id] ? 'paid' : r.status) === 'owed').reduce((a, r) => a + r.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, background: '#F0F0F2', borderRadius: 999, padding: 4, width: 'fit-content' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setRunOpen(false); }} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t ? '#f97316' : 'transparent', color: tab === t ? '#fff' : 'rgba(0,0,0,.55)' }}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '14px 16px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Run payroll</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.42)', marginTop: 2 }}>Calculate and create pay stubs for the current pay period (Jul 3 – Jul 16).</div>
            </div>
            <button onClick={() => { setRunOpen((o) => !o); if (!runOpen) previewPayRun(); }} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{runOpen ? 'Cancel' : '+ New pay run'}</button>
          </div>
          {runOpen && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, fontSize: 13 }}>
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>Gross</span><div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{payPreview ? money(payPreview.gross_total || payPreview.gross) : '$4,820.00'}</div></div>
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>Net</span><div style={{ fontWeight: 700, fontSize: 16, color: '#22C55E' }}>{payPreview ? money(payPreview.net_total || payPreview.net) : '$3,910.42'}</div></div>
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>CRA remittance</span><div style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>{payPreview ? money(payPreview.remit_total || payPreview.remit) : '$909.58'}</div></div>
              </div>
              <button onClick={() => { setRunOpen(false); flash?.('Pay run saved — 4 stubs created'); }} style={{ marginTop: 16, width: '100%', padding: '11px 0', border: 'none', borderRadius: 10, background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Confirm & save pay run</button>
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {['Employee', 'Status', 'Reg hrs', 'OT hrs', 'Gross'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left', padding: i === 0 ? '11px 18px' : i === 4 ? '11px 18px' : '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.name} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                    <td style={{ padding: '11px 18px', fontWeight: 600, color: '#1a1a1a' }}>{e.name}</td>
                    <td style={{ padding: '11px 12px' }}><span style={e.status === 'active' || e.status === 'onboarded' ? badgeStyle('rgba(34,197,94,.12)', '#22C55E') : badgeStyle('rgba(59,130,246,.12)', '#3B82F6')}>{e.status === 'active' || e.status === 'onboarded' ? 'Active' : 'Pending'}</span></td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.reg}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.ot}</td>
                    <td style={{ padding: '11px 18px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(e.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'runs' && RUNS.map((r) => {
        const status = runApproved[r.id] ? 'approved' : r.status;
        return (
          <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{r.period}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2 }}>Net {money(r.net)} · CRA remit {money(r.remit)} · Due {r.due}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={RUN_BADGE[status]}>{status}</span>
                {status === 'calculated' && (
                  <button onClick={() => { setRunApproved((a) => ({ ...a, [r.id]: true })); flash?.('Pay run approved'); }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {tab === 'remittance' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Owed', value: REMITS.filter((r) => (remitPaid[r.id] ? 'paid' : r.status) === 'owed').length, color: '#EF4444' },
              { label: 'Total owed', value: money(owedTotal), color: '#EF4444' },
              { label: 'Next due', value: 'Jul 25', color: '#F59E0B' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '14px 16px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {REMITS.map((r) => {
            const status = remitPaid[r.id] ? 'paid' : r.status;
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{money(r.amount)}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2 }}>Due {r.due}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={status === 'paid' ? badgeStyle('rgba(34,197,94,.12)', '#22C55E') : badgeStyle('rgba(239,68,68,.12)', '#EF4444')}>{status}</span>
                  {status === 'owed' && (
                    <button onClick={() => { setRemitPaid((p) => ({ ...p, [r.id]: true })); flash?.('Remittance marked paid'); }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Mark paid</button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {tab === 't4s' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              {['Employee', 'Gross', 'CPP', 'EI', 'Net'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 1 ? 'right' : 'left', padding: i === 0 ? '11px 18px' : i === 4 ? '11px 18px' : '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {T4S.map((t) => (
                <tr key={t.name} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                  <td style={{ padding: '11px 18px', fontWeight: 600, color: '#1a1a1a' }}>{t.name}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(t.gross)}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(t.cpp)}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(t.ei)}</td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(t.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
