'use client';

import { useState, useEffect, useCallback } from 'react';

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/command-center');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  const fetchInsight = useCallback(async (force = false) => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const url = force ? '/api/admin/insights?force=1' : '/api/admin/insights';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && !json.skipped) {
        setInsight(json);
      } else if (json.skipped) {
        setInsight(null);
      } else {
        setInsightError(json.error || 'Failed to load briefing');
      }
    } catch (err) {
      setInsightError(err.message);
    }
    setInsightLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    fetchInsight();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData, fetchInsight]);

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

      {/* AI Narrator briefing */}
      <NarratorCard
        insight={insight}
        loading={insightLoading}
        error={insightError}
        onRegenerate={() => fetchInsight(true)}
      />

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

function NarratorCard({ insight, loading, error, onRegenerate }) {
  const ageText = insight?.generated_at
    ? `${Math.round((Date.now() - new Date(insight.generated_at).getTime()) / 60000)} min ago`
    : '';

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 text-white">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">✦</span>
          <h3 className="font-semibold text-sm text-gray-200">AI Briefing</h3>
          {insight?.cached && (
            <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">cached</span>
          )}
          {ageText && (
            <span className="text-[10px] text-gray-400">{ageText}</span>
          )}
        </div>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded-lg px-2 py-1 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      {loading && !insight && (
        <p className="text-gray-400 text-sm py-2">Reading the dashboard...</p>
      )}

      {error && (
        <p className="text-red-400 text-sm py-2">{error}</p>
      )}

      {insight && (
        <p className="text-sm leading-relaxed text-gray-100">{insight.content}</p>
      )}

      {!loading && !insight && !error && (
        <p className="text-gray-500 text-sm py-2">Narrator is off. Enable it in Config.</p>
      )}
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
