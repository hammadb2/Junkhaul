'use client';

import { useState, useEffect } from 'react';

export default function GrowthPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/growth');
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <p className="text-gray-500 py-8">Loading growth data...</p>;
  if (!data) return <p className="text-gray-500 py-8">Failed to load growth data.</p>;

  const funnel = data.funnel || { quoted: 0, touch1: 0, touch2: 0, touch3: 0, converted: 0 };
  const offers = data.offers || [];
  const snapshots = data.snapshots || [];
  const cronHealth = data.cronHealth || [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Growth</h2>

      {/* Abandonment funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Abandonment funnel</h3>
        <div className="flex items-center gap-1">
          {['quoted', 'touch1', 'touch2', 'touch3', 'converted'].map((step, i) => {
            const count = funnel[step] || 0;
            const width = funnel.quoted ? Math.max(5, (count / funnel.quoted) * 100) : 0;
            const labels = {
              quoted: 'Quoted',
              touch1: 'T+1hr',
              touch2: 'T+20hr',
              touch3: 'T+47hr',
              converted: 'Booked',
            };
            return (
              <div key={step} className="flex-1 flex flex-col items-center">
                <div className="w-full h-6 bg-orange-100 rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">{labels[step]}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Opportunistic offers */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="font-semibold text-gray-800 p-4 border-b border-gray-100">Opportunistic offers</h3>
        {offers.length === 0 ? (
          <p className="p-4 text-gray-500">No offers sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Phone</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Original</th>
                <th className="text-left px-4 py-2 font-medium">Discounted</th>
                <th className="text-left px-4 py-2 font-medium">Discount %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.slice(0, 20).map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(o.created_at).toLocaleString('en-CA')}</td>
                  <td className="px-4 py-2 font-mono text-gray-700">{o.customer_phone}</td>
                  <td className="px-4 py-2 text-gray-700">{o.offer_type}</td>
                  <td className="px-4 py-2 text-gray-700">${o.original_price}</td>
                  <td className="px-4 py-2 text-gray-700">${o.discounted_price}</td>
                  <td className="px-4 py-2 text-gray-700">{o.discount_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Surge snapshots */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="font-semibold text-gray-800 p-4 border-b border-gray-100">Surge snapshots (latest)</h3>
        {snapshots.length === 0 ? (
          <p className="p-4 text-gray-500">No surge snapshots yet. Demand-snapshot cron will populate these.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Slot</th>
                <th className="text-left px-4 py-2 font-medium">Day type</th>
                <th className="text-left px-4 py-2 font-medium">Booked / Max</th>
                <th className="text-left px-4 py-2 font-medium">Fill %</th>
                <th className="text-left px-4 py-2 font-medium">Bucket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {snapshots.slice(0, 20).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{s.slot_date} {s.slot_time}</td>
                  <td className="px-4 py-2 text-gray-700">{s.day_type}</td>
                  <td className="px-4 py-2 text-gray-700">{s.jobs_booked} / {s.max_jobs}</td>
                  <td className="px-4 py-2 text-gray-700">{Math.round(s.fill_ratio * 100)}%</td>
                  <td className="px-4 py-2 text-gray-700">{s.days_out_bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cron health */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Cron health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {cronHealth.map((job) => (
            <div key={job.job_name} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
              <span className="font-medium text-gray-800 text-sm">{job.job_name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${job.last_status === 'finished' ? 'bg-green-100 text-green-700' : job.last_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {job.last_status} {job.last_run_at ? `· ${new Date(job.last_run_at).toLocaleString('en-CA')}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
