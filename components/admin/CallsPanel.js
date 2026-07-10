'use client';

import { useState, useEffect, useCallback } from 'react';

const SENTIMENT_COLORS = {
  frustrated: 'bg-red-100 text-red-700 border-red-200',
  negative: 'bg-orange-100 text-orange-700 border-orange-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  positive: 'bg-green-100 text-green-700 border-green-200',
};

export default function CallsPanel() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/call-history');
      const data = await res.json();
      setCalls(data.calls || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/call-history');
        const data = await res.json();
        if (mounted) setCalls(data.calls || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Calls</h2>
        <span className="text-sm text-gray-500">
          Sorted by sentiment risk. Frustrated/negative first.
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Loading calls...</p>
      ) : calls.length === 0 ? (
        <p className="text-gray-500 py-8">No calls found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Sentiment</th>
                <th className="text-left px-4 py-2 font-medium">Phone</th>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Summary</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calls.map((call) => (
                <tr
                  key={call.id}
                  onClick={() => setSelected(call)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${SENTIMENT_COLORS[call.sentiment] || SENTIMENT_COLORS.neutral}`}>
                      {call.sentiment || 'neutral'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-900 font-mono">{call.caller_number}</td>
                  <td className="px-4 py-2 text-gray-700">{call.caller_name || '-'}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-md truncate">
                    {call.call_summary || '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(call.call_date).toLocaleString('en-CA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Call Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Phone:</strong> {selected.caller_number}</p>
              <p><strong>Name:</strong> {selected.caller_name || '-'}</p>
              <p><strong>Sentiment:</strong> {selected.sentiment || 'neutral'}</p>
              <p><strong>Ended reason:</strong> {selected.ended_reason || '-'}</p>
              <p><strong>Date:</strong> {new Date(selected.call_date).toLocaleString('en-CA')}</p>
              <p><strong>Summary:</strong></p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selected.call_summary || 'No summary'}</p>
              <p><strong>Transcript:</strong></p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selected.transcript || 'No transcript'}</p>
            </div>
            <button
              onClick={() => window.open(`tel:${selected.caller_number}`)}
              className="w-full bg-[#f97316] text-white py-2 rounded-lg font-semibold"
            >
              Call back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
