'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ArrowLeft, CheckCheck, Info, AlertTriangle, CheckCircle, Radio, Calendar, ChevronRight } from 'lucide-react';

// ============================================================
// /portal/notifications — employee notification center. Light theme.
// ============================================================

const TYPE_ICONS = {
  info: { icon: Info, color: '#3B82F6' },
  warning: { icon: AlertTriangle, color: '#F59E0B' },
  success: { icon: CheckCircle, color: '#22C55E' },
  assignment: { icon: Calendar, color: '#3B82F6' },
  broadcast: { icon: Radio, color: '#f97316' },
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
    <div className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div onClick={() => router.push('/portal/schedule')} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={17} color="#1a1a1a" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Notifications</div>
          {unread > 0 && <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)' }}>{unread} unread</div>}
        </div>
        {unread > 0 ? (
          <div onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', width: 38, height: 38, justifyContent: 'center' }}>
            <CheckCheck size={15} color="#f97316" />
          </div>
        ) : (
          <div style={{ width: 38 }} />
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #F0F0F2', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Bell size={48} color="rgba(0,0,0,.15)" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: '#1a1a1a', fontSize: 16, fontWeight: 600 }}>No notifications yet</div>
            <div style={{ color: 'rgba(0,0,0,.4)', fontSize: 14, marginTop: 4 }}>You&apos;ll see job assignments, updates, and broadcasts here.</div>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const tc = TYPE_ICONS[n.type] || TYPE_ICONS.info;
              const Icon = tc.icon;
              const isUnread = !n.read_at;
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id, n.link)}
                  style={{ display: 'flex', gap: 12, padding: '14px 4px', borderBottom: '1px solid rgba(0,0,0,.06)', cursor: 'pointer', position: 'relative' }}
                >
                  {/* Unread dot */}
                  <div style={{ width: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isUnread && <div style={{ width: 7, height: 7, borderRadius: 999, background: '#f97316' }} />}
                  </div>
                  {/* Icon circle */}
                  <div style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={tc.color} />
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.6)', lineHeight: 1.4, marginBottom: 4 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)' }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {n.link && <ChevronRight size={15} color="rgba(0,0,0,.3)" style={{ flexShrink: 0, marginTop: 14 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
