'use client';

import { useState, useEffect } from 'react';

export default function IntelPanel() {
  const [summary, setSummary] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/quadrant-profit?days=${days}&summary=true`);
      const data = await res.json();
      setSummary(data.summary || []);
      setLoading(false);
    };
    fetchData();
  }, [days]);

  const maxRevenue = Math.max(...summary.map((s) => s.total_revenue || 0), 1);
  const maxProfit = Math.max(...summary.map((s) => s.total_profit || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Intel: Quadrant Profit</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8">Loading quadrant data...</p>
      ) : summary.length === 0 ? (
        <p className="text-gray-500 py-8">No data available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.map((q) => (
            <div key={q.quadrant} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">{q.quadrant}</h3>
                <span className="text-sm text-gray-500">{q.total_jobs} jobs</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Revenue</span>
                    <span className="font-semibold">${q.total_revenue}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(q.total_revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Profit</span>
                    <span className="font-semibold">${q.total_profit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(q.total_profit / maxProfit) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm pt-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Completed</p>
                    <p className="font-bold text-gray-900">{q.completed_jobs}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">Cancelled</p>
                    <p className="font-bold text-gray-900">{q.cancelled_jobs}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500">No-show</p>
                    <p className="font-bold text-gray-900">{q.no_show_jobs}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Avg margin: <span className="font-semibold">{q.avg_margin}%</span>
                  {' · '}Avg job: <span className="font-semibold">${q.avg_job_value}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
