'use client';

import { useState, useEffect } from 'react';

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/command-center');
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-gray-500 py-8">Loading command center...</p>;
  if (!data) return <p className="text-gray-500 py-8">Failed to load command center.</p>;

  const today = data.today || {};
  const surge = data.surge || {};
  const pendingOffers = data.pendingOffers || [];
  const urgentCalls = data.urgentCalls || [];
  const staleJobs = data.staleJobs || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Command Center</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today's jobs" value={today.jobs} />
        <StatCard label="To collect" value={`$${today.revenue_to_collect || 0}`} />
        <StatCard label="Collected" value={`$${today.revenue_collected || 0}`} />
        <StatCard label="Surge bookings" value={surge.count || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Urgent calls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Urgent calls (24h)</h3>
          {urgentCalls.length === 0 ? (
            <p className="text-gray-500 text-sm">No frustrated or negative calls.</p>
          ) : (
            <div className="space-y-2">
              {urgentCalls.map((call) => (
                <div key={call.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-700">{call.caller_number}</span>
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                      {call.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{call.call_summary || 'No summary'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stale cron jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Cron health</h3>
          {staleJobs.length === 0 ? (
            <p className="text-gray-500 text-sm">All monitored crons are running on schedule.</p>
          ) : (
            <div className="space-y-2">
              {staleJobs.map((job) => (
                <div key={job.job_name} className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                  <p className="font-semibold text-sm text-orange-800">{job.job_name}</p>
                  <p className="text-sm text-orange-700">Last run {job.minutes_since_run} minutes ago</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending offers */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Pending opportunistic offers</h3>
        {pendingOffers.length === 0 ? (
          <p className="text-gray-500 text-sm">No active offers waiting for a reply.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOffers.map((offer) => (
              <div key={offer.id} className="bg-gray-50 rounded-lg p-3">
                <p className="font-mono text-sm text-gray-700">{offer.customer_phone}</p>
                <p className="text-sm text-gray-600">
                  ${offer.discounted_price} <span className="text-gray-400">(was ${offer.original_price})</span>
                  {' · '}{offer.discount_percent}% off
                </p>
                <p className="text-xs text-gray-500">Expires {new Date(offer.offer_expires_at).toLocaleTimeString('en-CA')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
