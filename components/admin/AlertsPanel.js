'use client';

import { useState, useEffect } from 'react';

export default function AlertsPanel({ flash }) {
  const [alerts, setAlerts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    fetch('/api/admin/alerts')
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []));
  };

  useEffect(() => { load(); }, []);

  const act = async (action, alertId) => {
    setBusyId(alertId);
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alert_id: alertId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        flash?.(action === 'acknowledge' ? 'Alert acknowledged' : 'Alert resolved');
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      } else {
        flash?.(d.error || `Failed to ${action} alert`, '#EF4444');
      }
    } catch (e) {
      flash?.(`Failed to ${action} alert`, '#EF4444');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Operational Alerts</h2>
      {alerts.length === 0 && <p>No open alerts.</p>}
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="border rounded p-3 flex justify-between items-start gap-3">
            <div>
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-gray-600">{a.category} · {a.severity}{a.entity_type ? ` · ${a.entity_type} ${String(a.entity_id || '').slice(0, 8)}` : ''}</div>
              <div className="text-sm">{a.description}</div>
              <div className="text-xs text-gray-400 mt-1">
                {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                {a.acknowledged_at ? ` · acknowledged ${new Date(a.acknowledged_at).toLocaleString()}` : ''}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded text-xs ${a.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                {a.severity}
              </span>
              <div className="flex gap-1">
                {!a.acknowledged_at && (
                  <button
                    onClick={() => act('acknowledge', a.id)}
                    disabled={busyId === a.id}
                    className="px-2 py-1 rounded text-xs font-semibold border border-gray-300 bg-white cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => act('resolve', a.id)}
                  disabled={busyId === a.id}
                  className="px-2 py-1 rounded text-xs font-semibold border-none bg-green-600 text-white cursor-pointer"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
