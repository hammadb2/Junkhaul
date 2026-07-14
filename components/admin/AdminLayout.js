'use client';
// Admin shell: sidebar nav + topbar + view router.
// This REPLACES the top-level layout currently inline in app/admin/page.js
// (the `<aside>` / topbar JSX and the `NAV` array). Section bodies now live
// in their own component files (imported below) instead of being inline.

import { useState } from 'react';
import {
  IconHome, IconTruck, IconCalendar, IconClipboard, IconHourglass, IconDollar, IconWallet,
  IconUsers, IconTrending, IconPhone, IconDiamond, IconLink, IconSettings, IconHistory,
  IconLogOut, IconSearch, IconBell,
} from './Icons';

import DashboardView from './DashboardView';
import DispatchView from './DispatchView';
import ScheduleView from './ScheduleView';
import LeadsView from './LeadsView';
import WaitlistView from './WaitlistView';
import EarningsDashboard from './EarningsDashboard';
import CrewView from './CrewView';
import PayrollPanel from './PayrollPanel';
import GrowthPanel from './GrowthPanel';
import CallsPanel from './CallsPanel';
import IntelPanel from './IntelPanel';
import ReferralsPanel from './ReferralsPanel';
import ConfigPanel from './ConfigPanel';
import AuditTrail from './AuditTrail';

const NAV = [
  { label: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', Icon: IconHome },
  ]},
  { label: 'Operations', items: [
    { id: 'dispatch', label: 'Dispatch', Icon: IconTruck },
    { id: 'schedule', label: 'Schedule', Icon: IconCalendar },
    { id: 'leads', label: 'Leads', Icon: IconClipboard },
    { id: 'waitlist', label: 'Waitlist', Icon: IconHourglass, badge: 3 },
  ]},
  { label: 'Finance', items: [
    { id: 'earnings', label: 'Earnings', Icon: IconDollar },
    { id: 'payroll', label: 'Payroll', Icon: IconWallet },
  ]},
  { label: 'People', items: [
    { id: 'crew', label: 'Crew', Icon: IconUsers },
  ]},
  { label: 'Growth', items: [
    { id: 'growth', label: 'Growth', Icon: IconTrending },
    { id: 'calls', label: 'Calls', Icon: IconPhone, badge: 2 },
    { id: 'intel', label: 'Intel', Icon: IconDiamond },
    { id: 'referrals', label: 'Referrals', Icon: IconLink },
  ]},
  { label: 'System', items: [
    { id: 'config', label: 'Config', Icon: IconSettings },
    { id: 'audit', label: 'Audit', Icon: IconHistory },
  ]},
];

const VIEW_META = {
  dashboard: ['Dashboard', "Today's operations at a glance"],
  dispatch: ['Dispatch', 'Route planning & job management'],
  schedule: ['Schedule', 'Upcoming slots across the week'],
  leads: ['Leads', 'Quoted but not yet booked'],
  waitlist: ['Waitlist', 'Customers waiting for an open slot'],
  earnings: ['Earnings', 'Revenue performance & sources'],
  payroll: ['Payroll', 'Pay runs, remittances & T4s'],
  crew: ['Crew', 'Team roster, onboarding & safety'],
  growth: ['Growth', 'Funnel health & marketing spend'],
  calls: ['Calls', 'AI voice agent call history'],
  intel: ['Intel', 'Profitability by service quadrant'],
  referrals: ['Referrals', 'Referral program performance'],
  config: ['Config', 'System settings & kill switches'],
  audit: ['Audit', 'System event log'],
};

const VIEWS = {
  dashboard: DashboardView, dispatch: DispatchView, schedule: ScheduleView, leads: LeadsView,
  waitlist: WaitlistView, earnings: EarningsDashboard, crew: CrewView, payroll: PayrollPanel,
  growth: GrowthPanel, calls: CallsPanel, intel: IntelPanel, referrals: ReferralsPanel,
  config: ConfigPanel, audit: AuditTrail,
};

export default function AdminLayout({ onLogout }) {
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Pass this down to section components so any action (save, notify, etc.)
  // can surface a consistent top-right confirmation toast.
  const flash = (text, color = '#22C55E') => {
    setToast({ text, color });
    setTimeout(() => setToast(null), 2600);
  };

  const [meta0, meta1] = VIEW_META[view];
  const ActiveView = VIEWS[view];

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#F5F5F7' }}>
      <aside style={{ width: 232, minWidth: 232, background: '#fff', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto', borderRight: '1px solid rgba(0,0,0,.07)' }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 13, flexShrink: 0 }}>JH</div>
          <div>
            <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', lineHeight: 1.2 }}>Junk Haul</div>
            <div style={{ color: 'rgba(0,0,0,.38)', fontSize: 10.5, fontWeight: 500 }}>Operator Console</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {NAV.map((group) => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              <div style={{ padding: '0 10px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'rgba(0,0,0,.32)', textTransform: 'uppercase' }}>{group.label}</div>
              {group.items.map((item) => {
                const active = view === item.id;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
                      borderRadius: 8, marginBottom: 1, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
                      color: active ? '#f97316' : 'rgba(0,0,0,.58)',
                      fontWeight: active ? 600 : 500,
                      background: active ? 'rgba(249,115,22,.1)' : 'transparent',
                    }}
                  >
                    <span style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, background: '#F5F5F7', marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(249,115,22,.14)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>OP</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#1a1a1a', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Operator</div>
              <div style={{ color: 'rgba(0,0,0,.4)', fontSize: 10.5 }}>Calgary, AB</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12.5, fontWeight: 500, background: 'transparent', color: 'rgba(0,0,0,.4)' }}
          >
            <IconLogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{meta0}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.42)', marginTop: 1 }}>{meta1}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><IconSearch /></span>
              <input placeholder="Search..." style={{ padding: '8px 12px 8px 32px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', background: '#F5F5F7', fontSize: 13, width: 200, outline: 'none' }} />
            </div>
            <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
              <IconBell />
              <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #fff' }} />
            </button>
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', top: 70, right: 28, zIndex: 100, background: '#1a1a1a', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: toast.color }} />
            {toast.text}
          </div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          <ActiveView flash={flash} />
        </div>
      </main>
    </div>
  );
}
