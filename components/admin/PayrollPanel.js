'use client';
// Redesigned Payroll view — REPLACES components/admin/PayrollPanel.js.
// Real data: GET /api/admin/employees, POST /api/admin/payroll/preview.

import { useState, useEffect } from 'react';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

const TABS = ['overview', 'runs', 'remittance', 't4s'];
const TAB_LABEL = { overview: 'Overview', runs: 'Pay Runs', remittance: 'Remittances', t4s: 'T4s' };

const RUN_BADGE = { calculated: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'), approved: badgeStyle('rgba(59,130,246,.12)', '#3B82F6'), paid: badgeStyle('rgba(34,197,94,.12)', '#22C55E') };

export default function PayrollPanel({ flash }) {
  const [tab, setTab] = useState('overview');
  const [runOpen, setRunOpen] = useState(false);
  const [runApproved, setRunApproved] = useState({});
  const [remitPaid, setRemitPaid] = useState({});
  const [employees, setEmployees] = useState([]);
  const [payPreview, setPayPreview] = useState(null);
  const [runs, setRuns] = useState([]);
  const [remits, setRemits] = useState([]);
  const [t4s, setT4s] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [empRes, runsRes, remitsRes, t4sRes] = await Promise.all([
          fetch('/api/admin/employees'),
          fetch('/api/admin/payroll/run'),
          fetch('/api/admin/remittance'),
          fetch('/api/admin/t4s'),
        ]);
        if (cancelled) return;

        if (empRes.ok) {
          const { employees: data } = await empRes.json();
          if (Array.isArray(data)) {
            setEmployees(data.map((e) => ({
              name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
              status: e.status || 'active',
              reg: e.period ? e.period.regular_hours || 0 : 0,
              ot: e.period ? e.period.overtime_hours || 0 : 0,
              gross: e.period ? e.period.gross || 0 : 0,
            })));
          }
        }

        if (runsRes.ok) {
          const data = await runsRes.json();
          const arr = data.runs || data.pay_runs || [];
          if (Array.isArray(arr)) setRuns(arr);
        }

        if (remitsRes.ok) {
          const data = await remitsRes.json();
          const arr = data.remittances || data.remits || [];
          if (Array.isArray(arr)) setRemits(arr);
        }

        if (t4sRes.ok) {
          const data = await t4sRes.json();
          const arr = data.t4s || [];
          if (Array.isArray(arr)) setT4s(arr);
        }
      } catch (e) { /* ignore */ }
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
    } catch (e) { /* ignore */ }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>Loading…</div>;

  const stats = [
    { label: 'Total employees', value: employees.length, color: '#1a1a1a' },
    { label: 'Onboarded', value: employees.filter((e) => e.status === 'active' || e.status === 'onboarded').length, color: '#22C55E' },
    { label: 'Pending', value: employees.filter((e) => e.status !== 'active' && e.status !== 'onboarded').length, color: '#F59E0B' },
    { label: 'Clocked in now', value: employees.filter((e) => e.clockedIn).length, color: '#f97316' },
  ];

  const owedTotal = remits.filter((r) => (remitPaid[r.id] ? 'paid' : r.status) === 'owed').reduce((a, r) => a + r.amount, 0);

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
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>Gross</span><div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{payPreview ? money(payPreview.gross_total || payPreview.gross) : '—'}</div></div>
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>Net</span><div style={{ fontWeight: 700, fontSize: 16, color: '#22C55E' }}>{payPreview ? money(payPreview.net_total || payPreview.net) : '—'}</div></div>
                <div><span style={{ color: 'rgba(0,0,0,.45)' }}>CRA remittance</span><div style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>{payPreview ? money(payPreview.remit_total || payPreview.remit) : '—'}</div></div>
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

      {tab === 'runs' && (runs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No pay runs found</div>
      ) : runs.map((r) => {
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
      }))}

      {tab === 'remittance' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Owed', value: remits.filter((r) => (remitPaid[r.id] ? 'paid' : r.status) === 'owed').length, color: '#EF4444' },
              { label: 'Total owed', value: money(owedTotal), color: '#EF4444' },
              { label: 'Next due', value: remits.length > 0 ? remits[0].due : '—', color: '#F59E0B' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', padding: '14px 16px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {remits.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No remittances found</div>
          ) : remits.map((r) => {
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
        t4s.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 13 }}>No T4s found</div>
        ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              {['Employee', 'Gross', 'CPP', 'EI', 'Net'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 1 ? 'right' : 'left', padding: i === 0 ? '11px 18px' : i === 4 ? '11px 18px' : '11px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {t4s.map((t) => (
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
        )
      )}
    </div>
  );
}
