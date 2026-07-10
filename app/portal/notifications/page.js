'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ArrowLeft, CheckCheck, Info, AlertTriangle, CheckCircle, Radio, Calendar, ChevronRight } from 'lucide-react';

const D = '#0A0A0B';
const CARD = '#161618';
const ORANGE = '#f97316';
const TXT = 'rgba(255,255,255,0.9)';
const TXT2 = 'rgba(255,255,255,0.6)';
const TXT3 = 'rgba(255,255,255,0.4)';

const TYPE_ICONS = {
  info: { icon: Info, color: '#60A5FA' },
  warning: { icon: AlertTriangle, color: '#F59E0B' },
  success: { icon: CheckCircle, color: '#22C55E' },
  assignment: { icon: Calendar, color: '#60A5FA' },
  broadcast: { icon: Radio, color: ORANGE },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/notifications');
      if (res.status === 401) { router.push('/portal'); return; }
      const d = await res.json();
      setNotifications(d.notifications || []);
      setUnread(d.unread || 0);
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = async () => {
    await fetch('/api/employee/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const markRead = async (id, link) => {
    await fetch('/api/employee/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    if (link) router.push(link);
  };

  return (
    <main className="min-h-dvh safe-top safe-bottom" style={{ background: D }}>
      {/* Header */}
      <header className="glass-bar" style={{ position: 'sticky', top: 0, zIndex: 20, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/portal/schedule')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={TXT2} />
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>Notifications</div>
            {unread > 0 && <div style={{ fontSize: 13, color: ORANGE }}>{unread} unread</div>}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="glass-btn" style={{ padding: '8px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: ORANGE }}>
            <CheckCheck size={16} /> Mark all
          </button>
        )}
      </header>

      <div style={{ maxWidth: 448, margin: '0 auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Bell size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: TXT2, fontSize: 16, fontWeight: 600 }}>No notifications yet</div>
            <div style={{ color: TXT3, fontSize: 14, marginTop: 4 }}>You&apos;ll see job assignments, updates, and broadcasts here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n) => {
              const tc = TYPE_ICONS[n.type] || TYPE_ICONS.info;
              const Icon = tc.icon;
              const isUnread = !n.read_at;
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id, n.link)}
                  className="dark-card"
                  style={{
                    padding: 16, textAlign: 'left', cursor: 'pointer',
                    borderLeft: isUnread ? `3px solid ${tc.color}` : '3px solid transparent',
                    background: isUnread ? 'rgba(249,115,22,0.04)' : CARD,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={tc.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: TXT }}>{n.title}</span>
                        <span style={{ fontSize: 12, color: TXT3, whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <div style={{ fontSize: 14, color: TXT2, marginTop: 4 }}>{n.body}</div>}
                      {n.link && <div style={{ fontSize: 13, color: ORANGE, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>Open <ChevronRight size={14} /></div>}
                    </div>
                    {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, flexShrink: 0, marginTop: 6 }} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
