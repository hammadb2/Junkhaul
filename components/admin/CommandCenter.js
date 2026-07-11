'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

      {/* AI Agent — interactive chat */}
      <AgentChat />

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

      {/* Crew status — who's clocked in right now */}
      <CrewStatusWidget />
    </div>
  );
}

// ============================================================
// CrewStatusWidget — shows who's clocked in + period hours
// Uses /api/admin/employees
// ============================================================
function CrewStatusWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => fetch('/api/admin/employees').then((r) => r.json()).then(setData).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;
  const clockedIn = (data.employees || []).filter((e) => e.clocked_in);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Crew status</h3>
        <span className="text-xs text-gray-500">
          {clockedIn.length} clocked in · {data.summary?.onboarded || 0} onboarded
        </span>
      </div>
      {clockedIn.length === 0 ? (
        <p className="text-gray-500 text-sm">No one is clocked in right now.</p>
      ) : (
        <div className="space-y-2">
          {clockedIn.map((e) => {
            const mins = e.clock_in_duration_min || 0;
            const h = Math.floor(mins / 60);
            const m = Math.round(mins % 60);
            return (
              <div key={e.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-sm text-gray-800">{e.name || e.email}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {h > 0 ? `${h}h ` : ''}{m}m
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AgentChat — interactive AI agent that can take actions
// ============================================================
function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation: messages,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.response, actions: json.actions || [] }]);
        if (json.actions && json.actions.length > 0) {
          setActions((prev) => [...json.actions.reverse(), ...prev].slice(0, 20));
        }
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${json.error}`, isError: true }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Connection error: ${err.message}`, isError: true }]);
    }
    setLoading(false);
  };

  const quickActions = [
    "What's happening today?",
    'Call the last frustrated customer',
    'Send a reminder SMS to all confirmed bookings for today',
    'Show me today\'s revenue summary',
    'Check if any cron jobs are stale',
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-sm text-gray-200">AI Agent</h3>
          <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full border border-green-700">
            can take actions
          </span>
        </div>
        {actions.length > 0 && (
          <span className="text-[10px] text-gray-400">{actions.length} recent actions</span>
        )}
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm mb-3">
              I&apos;m your AI operations agent. I can send SMS, trigger calls, look up bookings,
              cancel/reschedule, adjust config, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-full px-3 py-1.5"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.isError
                ? 'bg-red-900 text-red-200 border border-red-700'
                : 'bg-gray-800 text-gray-100 border border-gray-700'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Show actions taken */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.actions.map((act, j) => (
                    <div key={j} className="text-xs bg-gray-900/50 rounded px-2 py-1 border border-gray-700/50">
                      <span className={act.result.success ? 'text-green-400' : 'text-red-400'}>
                        {act.result.success || act.result.error ? (act.result.success ? '✓' : '✗') : '→'}
                      </span>{' '}
                      <span className="text-gray-300 font-mono">{act.tool}</span>
                      {act.result.message && (
                        <span className="text-gray-400"> — {act.result.message}</span>
                      )}
                      {act.result.error && (
                        <span className="text-red-400"> — {act.result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">Working on it...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Tell the agent what to do..."
          disabled={loading}
          className="flex-1 bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function NarratorCard({ insight, loading, error, onRegenerate }) {
  const ageText = insight?.generated_at
    ? `${Math.round((Date.now() - new Date(insight.generated_at).getTime()) / 60000)} min ago`
    : '';

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 text-[#1a1a1a]">
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
          className="text-xs text-gray-400 hover:text-[#1a1a1a] border border-gray-600 rounded-lg px-2 py-1 disabled:opacity-50"
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
