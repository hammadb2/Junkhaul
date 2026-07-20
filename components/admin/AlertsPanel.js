'use client';

import { useState, useEffect } from 'react';

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/admin/alerts')
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Operational Alerts</h2>
      {alerts.length === 0 && <p>No open alerts.</p>}
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="border rounded p-3 flex justify-between items-start">
            <div>
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-gray-600">{a.category} · {a.severity}</div>
              <div className="text-sm">{a.description}</div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${a.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
              {a.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
