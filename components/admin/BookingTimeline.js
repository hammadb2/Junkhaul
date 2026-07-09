'use client';

import { useState, useEffect } from 'react';

const EVENT_ICONS = {
  surge_applied: '⚡',
  deadhead_offer_sent: '📍',
  proactive_offer_sent: '📍',
  abandonment_touch1_sent: '💬',
  abandonment_touch2_sent: '💬',
  abandonment_touch3_sent: '💬',
  review_request_sent: '⭐',
  sms_inbound: '⬇️',
  sms_outbound: '⬆️',
  offer_sent: '💰',
  system_event: '⚙️',
  message: '💬',
  offer: '💰',
};

const EVENT_LABELS = {
  system_event: 'System event',
  message: 'SMS',
  offer: 'Offer',
};

export default function BookingTimeline({ bookingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/bookings/${bookingId}/timeline`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    fetchTimeline();
  }, [bookingId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-lg">
            Timeline {data?.booking?.booking_ref && `· ${data.booking.booking_ref}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-500 py-8">Loading timeline...</p>
          ) : !data || data.timeline?.length === 0 ? (
            <p className="text-gray-500 py-8">No timeline events found.</p>
          ) : (
            <div className="space-y-4">
              {data.booking && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p><strong>Booking created:</strong> {new Date(data.booking.created_at).toLocaleString('en-CA')}</p>
                  <p><strong>Status:</strong> {data.booking.status}</p>
                  <p><strong>Total:</strong> ${data.booking.total_price} · <strong>Balance:</strong> ${data.booking.balance_due}</p>
                  <p><strong>Surge:</strong> {data.booking.surge_mode || 'none'} {data.booking.surge_multiplier ? `(${data.booking.surge_multiplier}x)` : ''}</p>
                  <p><strong>No-show risk:</strong> {data.booking.no_show_risk_score || 0}%</p>
                </div>
              )}

              <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {data.timeline.map((item, i) => {
                  const type = item.source || 'system_event';
                  const icon = EVENT_ICONS[item.event_type] || EVENT_ICONS[type] || '•';
                  return (
                    <div key={i} className="pl-6 relative">
                      <span className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-[10px]">
                        {icon}
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString('en-CA')}
                      </p>
                      <p className="font-medium text-sm text-gray-900">
                        {item.event_type || EVENT_LABELS[type] || type}
                      </p>
                      {item.payload && Object.keys(item.payload).length > 0 && (
                        <p className="text-xs text-gray-600 font-mono truncate">
                          {JSON.stringify(item.payload)}
                        </p>
                      )}
                      {item.body && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">{item.body}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
