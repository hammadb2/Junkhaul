'use client';

import { useState, useEffect } from 'react';

export default function SecurityPanel() {
  const [events, setEvents] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  useEffect(() => {
    fetch(`/api/admin/security?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []));
  }, [entityType, entityId]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Security & Audit</h2>
      <div className="flex gap-4 mb-4">
        <input
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          placeholder="Entity type"
          className="border rounded px-2 py-1"
        />
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="Entity ID"
          className="border rounded px-2 py-1"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Time</th>
            <th className="py-2">Action</th>
            <th className="py-2">Actor</th>
            <th className="py-2">Entity</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="py-2">{new Date(e.created_at).toLocaleString()}</td>
              <td className="py-2">{e.action}</td>
              <td className="py-2">{e.actor_id ? e.actor_id.slice(0, 8) : 'system'}</td>
              <td className="py-2">{e.entity_type} {e.entity_id?.slice(0, 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
