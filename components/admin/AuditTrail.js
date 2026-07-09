'use client';

import { useState, useEffect } from 'react';

const EVENT_TYPES = [
  'All',
  'surge_applied',
  'deadhead_offer_sent',
  'proactive_offer_sent',
  'abandonment_touch1_sent',
  'abandonment_touch2_sent',
  'abandonment_touch3_sent',
  'review_request_sent',
  'sms_inbound',
  'sms_outbound',
];

export default function AuditTrail() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const url = new URL('/api/admin/events', window.location.origin);
        if (filter !== 'All') url.searchParams.set('type', filter);
        url.searchParams.set('limit', limit);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (mounted) setEvents(data.events || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchEvents();
    return () => { mounted = false; };
  }, [filter, limit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Audit Trail</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500 py-8">No events found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Event</th>
                <th className="text-left px-4 py-2 font-medium">Booking / Lead</th>
                <th className="text-left px-4 py-2 font-medium">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-CA')}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {e.event_type}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {e.booking_id ? `Booking ${e.booking_id.slice(0, 8)}` : e.lead_id ? `Lead ${e.lead_id.slice(0, 8)}` : e.customer_phone || '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs max-w-xs truncate">
                    {JSON.stringify(e.payload || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
