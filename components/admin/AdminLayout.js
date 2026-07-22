'use client';
// Admin shell: sidebar nav + topbar + view router.
// This REPLACES the top-level layout currently inline in app/admin/page.js
// (the `<aside>` / topbar JSX and the `NAV` array). Section bodies now live
// in their own component files (imported below) instead of being inline.

import { useState, useEffect } from 'react';
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
import CostConfigPanel from './CostConfigPanel';
import QuoteDecisionsView from './QuoteDecisionsView';
import FreonEvidenceQueue from './FreonEvidenceQueue';
import ItemEvidenceReview from './ItemEvidenceReview';
import AIQualityPanel from './AIQualityPanel';
import AuditTrail from './AuditTrail';
import DispatchLogView from './DispatchLogView';
import MarketingPanel from './MarketingPanel';
import DonationsView from './DonationsView';
import BookingDetailView from './BookingDetailView';
import CommunicationsPanel from './CommunicationsPanel';
import ManagerDashboard from './ManagerDashboard';
import StaffAccessPanel from './StaffAccessPanel';
import SecurityPanel from './SecurityPanel';
import AlertsPanel from './AlertsPanel';
import LaunchGatesPanel from './LaunchGatesPanel';

const NAV = [
  { label: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', Icon: IconHome },
  ]},
  { label: 'Operations', items: [
    { id: 'dispatch', label: 'Dispatch', Icon: IconTruck },
    { id: 'manager', label: 'Manager Ops', Icon: IconBell },
    { id: 'bookingDetail', label: 'Booking Detail', Icon: IconClipboard },
    { id: 'schedule', label: 'Schedule', Icon: IconCalendar },
    { id: 'leads', label: 'Leads', Icon: IconClipboard },
    { id: 'waitlist', label: 'Waitlist', Icon: IconHourglass },
    { id: 'donations', label: 'Donations', Icon: IconDiamond },
  ]},
  { label: 'Finance', items: [
    { id: 'earnings', label: 'Earnings', Icon: IconDollar },
    { id: 'payroll', label: 'Payroll', Icon: IconWallet },
    { id: 'costConfig', label: 'Cost Config', Icon: IconDollar },
    { id: 'quoteDecisions', label: 'Quote Exceptions', Icon: IconHourglass },
    { id: 'freonEvidence', label: 'Freon Evidence', Icon: IconSearch },
    { id: 'itemEvidence', label: 'Item Evidence Review', Icon: IconSearch },
    { id: 'aiQuality', label: 'AI Quality', Icon: IconTrending },
  ]},
  { label: 'People', items: [
    { id: 'crew', label: 'Crew', Icon: IconUsers },
    { id: 'staffAccess', label: 'Staff Access', Icon: IconUsers },
  ]},
  { label: 'Growth', items: [
    { id: 'growth', label: 'Growth', Icon: IconTrending },
    { id: 'marketing', label: 'Marketing', Icon: IconTrending },
    { id: 'communications', label: 'Communications', Icon: IconPhone },
    { id: 'calls', label: 'Calls', Icon: IconPhone },
    { id: 'intel', label: 'Intel', Icon: IconDiamond },
    { id: 'referrals', label: 'Referrals', Icon: IconLink },
  ]},
  { label: 'Governance', items: [
    { id: 'security', label: 'Security & Audit', Icon: IconHistory },
    { id: 'alerts', label: 'Alerts', Icon: IconBell },
    { id: 'launchGates', label: 'Launch Gates', Icon: IconClipboard },
  ]},
  { label: 'System', items: [
    { id: 'config', label: 'Config', Icon: IconSettings },
    { id: 'dispatchlog', label: 'Dispatch Log', Icon: IconPhone },
    { id: 'audit', label: 'Audit', Icon: IconHistory },
  ]},
];

const VIEW_META = {
  dashboard: ['Dashboard', "Today's operations at a glance"],
  dispatch: ['Dispatch', 'Route planning & job management'],
  manager: ['Manager Ops', 'Today’s operational queues and manager-safe controls'],
  bookingDetail: ['Booking Detail', 'Customer, quote, pricing, attribution, comms, timeline'],
  schedule: ['Schedule', 'Upcoming slots across the week'],
  leads: ['Leads', 'Quoted but not yet booked'],
  waitlist: ['Waitlist', 'Customers waiting for an open slot'],
  donations: ['Donations', 'Donation-only pickup review and route-fit queue'],
  earnings: ['Earnings', 'Revenue performance & sources'],
  payroll: ['Payroll', 'Pay runs, remittances & T4s'],
  costConfig: ['Cost Config', 'Versioned operating costs and pricing policy'],
  quoteDecisions: ['Quote Exceptions', 'Pending or underpriced quotes requiring review'],
  freonEvidence: ['Freon Evidence', 'AI-flagged refrigerant evacuation stickers awaiting verification'],
  itemEvidence: ['Item Evidence Review', 'Review AI-detected items, weights and hazards'],
  aiQuality: ['AI Quality', 'Model performance, correction rate and safety metrics'],
  crew: ['Crew', 'Team roster, onboarding & safety'],
  staffAccess: ['Staff Access', 'Owner-only roles, permissions and manager scopes'],
  growth: ['Growth', 'Funnel health & marketing spend'],
  marketing: ['Marketing', 'Campaign, door-hanger, flyer and attribution reporting'],
  communications: ['Communications', 'Quo messages, STOP state, expected replies and failure retry'],
  calls: ['Calls', 'AI voice agent call history'],
  intel: ['Intel', 'Profitability by service quadrant'],
  referrals: ['Referrals', 'Referral program performance'],
  config: ['Config', 'System settings & kill switches'],
  audit: ['Audit', 'System event log'],
  dispatchlog: ['Dispatch Log', 'AI dispatch agent action history'],
  security: ['Security & Audit', 'Permission matrix and immutable audit events'],
  alerts: ['Alerts', 'Open operational and security alerts'],
  launchGates: ['Launch Gates', 'Staged launch checklist and sign-offs'],
};

const VIEWS = {
  dashboard: DashboardView, dispatch: DispatchView, bookingDetail: BookingDetailView, schedule: ScheduleView, leads: LeadsView,
  manager: ManagerDashboard,
  waitlist: WaitlistView, donations: DonationsView, earnings: EarningsDashboard, crew: CrewView, payroll: PayrollPanel,
  staffAccess: StaffAccessPanel,
  growth: GrowthPanel, marketing: MarketingPanel, communications: CommunicationsPanel, calls: CallsPanel, intel: IntelPanel, referrals: ReferralsPanel,
  costConfig: CostConfigPanel,
  quoteDecisions: QuoteDecisionsView,
  freonEvidence: FreonEvidenceQueue,
  itemEvidence: ItemEvidenceReview,
  aiQuality: AIQualityPanel,
  config: ConfigPanel, audit: AuditTrail, dispatchlog: DispatchLogView,
  security: SecurityPanel, alerts: AlertsPanel, launchGates: LaunchGatesPanel,
};

export default function AdminLayout({ onLogout }) {
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [badges, setBadges] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Pass this down to section components so any action (save, notify, etc.)
  // can surface a consistent top-right confirmation toast.
  const flash = (text, color = '#22C55E') => {
    setToast({ text, color });
    setTimeout(() => setToast(null), 2600);
  };

  // Fetch dynamic badge counts (waitlist entries needing notification, negative-sentiment calls)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [waitlistRes, callsRes] = await Promise.all([
          fetch('/api/admin/waitlist'),
          fetch('/api/admin/call-history'),
        ]);
        const waitlistData = waitlistRes.ok ? await waitlistRes.json() : null;
        const callsData = callsRes.ok ? await callsRes.json() : null;
        if (cancelled) return;

        const waitlistCount = (waitlistData?.waitlist || []).filter(w => !w.notified).length;
        const callsCount = (callsData?.calls || []).filter(c =>
          c.sentiment === 'frustrated' || c.sentiment === 'negative'
        ).length;

        setBadges({ waitlist: waitlistCount, calls: callsCount });
      } catch (e) { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Refresh badges every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        try {
          const [waitlistRes, callsRes] = await Promise.all([
            fetch('/api/admin/waitlist'),
            fetch('/api/admin/call-history'),
          ]);
          const waitlistData = waitlistRes.ok ? await waitlistRes.json() : null;
          const callsData = callsRes.ok ? await callsRes.json() : null;

          const waitlistCount = (waitlistData?.waitlist || []).filter(w => !w.notified).length;
          const callsCount = (callsData?.calls || []).filter(c =>
            c.sentiment === 'frustrated' || c.sentiment === 'negative'
          ).length;

          setBadges({ waitlist: waitlistCount, calls: callsCount });
        } catch (e) { /* silent */ }
      })();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications (stale cron jobs, urgent calls, unnotified waitlist entries)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/command-center');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const notifs = [];
        if (Array.isArray(data.staleJobs)) {
          for (const job of data.staleJobs) {
            notifs.push({ type: 'cron', text: `Cron job stale: ${job.job_name}`, color: '#F59E0B' });
          }
        }
        if (Array.isArray(data.urgentCalls)) {
          for (const call of data.urgentCalls) {
            notifs.push({ type: 'call', text: `Urgent call: ${call.caller_name || call.caller_number}`, color: '#EF4444' });
          }
        }
        if (badges.waitlist > 0) {
          notifs.push({ type: 'waitlist', text: `${badges.waitlist} waitlist entries need notification`, color: '#3B82F6' });
        }
        setNotifications(notifs);
      } catch (e) { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [badges.waitlist]);

  // Search bookings by name or phone
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch('/api/admin/bookings');
      if (!res.ok) return;
      const { bookings } = await res.json();
      if (!Array.isArray(bookings)) return;
      const filtered = bookings.filter(b =>
        (b.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (b.phone || '').includes(q)
      ).slice(0, 8);
      setSearchResults(filtered);
    } catch (err) { /* silent */ }
  };

  const [meta0, meta1] = VIEW_META[view];
  const ActiveView = VIEWS[view];

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#F5F5F7' }} onClick={() => { setShowNotifs(false); setSearchResults(null); }}>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-stat-grid { grid-template-columns: 1fr 1fr !important; }
          .admin-content { padding: 16px !important; }
        }
        @media (max-width: 480px) {
          .admin-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <aside className="admin-sidebar" style={{ width: 232, minWidth: 232, background: '#fff', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto', borderRight: '1px solid rgba(0,0,0,.07)' }}>
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
                    {badges[item.id] > 0 && (
                      <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>{badges[item.id]}</span>
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
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><IconSearch /></span>
              <input
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search bookings..."
                aria-label="Search bookings"
                style={{ padding: '8px 12px 8px 32px', borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', background: '#F5F5F7', fontSize: 13, width: 200, outline: 'none' }}
              />
              {searchResults && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: 60, right: 80, width: 340, maxHeight: 400, overflowY: 'auto', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 12px 32px rgba(0,0,0,.12)', zIndex: 200 }}>
                  {searchResults.map((b) => (
                    <div key={b.id} onClick={() => { setView('dispatch'); setSearchResults(null); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,.04)', cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{b.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.42)' }}>{b.phone || ''} · {b.address || ''}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', fontWeight: 600 }}>{b.job_date}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
                <div style={{ position: 'absolute', top: 60, right: 80, width: 340, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 12px 32px rgba(0,0,0,.12)', zIndex: 200, padding: '20px 16px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 12.5 }}>
                  No bookings found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowNotifs(s => !s)}
                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(0,0,0,.08)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              >
                <IconBell />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #fff' }} />
                )}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', top: 60, right: 28, width: 340, maxHeight: 400, overflowY: 'auto', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 12px 32px rgba(0,0,0,.12)', zIndex: 200 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.06)', fontSize: 13, fontWeight: 700, color: '#1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Notifications
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', fontWeight: 500 }}>{notifications.length} item(s)</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 18px', textAlign: 'center', color: 'rgba(0,0,0,.4)', fontSize: 12.5 }}>All caught up — no alerts.</div>
                  ) : notifications.map((n, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color, marginTop: 5, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: '#1a1a1a', fontWeight: 500 }}>{n.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', top: 70, right: 28, zIndex: 100, background: '#1a1a1a', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: toast.color }} />
            {toast.text}
          </div>
        )}

        <div className="admin-content" style={{ flex: 1, padding: '24px 28px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          <ActiveView flash={flash} />
        </div>
      </main>
    </div>
  );
}
