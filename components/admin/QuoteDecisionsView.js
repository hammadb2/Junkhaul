'use client';

import { useEffect, useState } from 'react';

const stateBadge = {
  approved: 'bg-green-100 text-green-800',
  booked: 'bg-green-100 text-green-800',
  manual_review: 'bg-amber-100 text-amber-800',
  needs_evidence: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  superseded: 'bg-gray-100 text-gray-800',
};

function fmtCents(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function QuoteDecisionsView() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quote-decisions' + (filter ? `?state=${filter}` : ''));
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDecisions(json.decisions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function overrideDecision(id, newPriceCents) {
    const reason = prompt('Override reason (required):');
    if (!reason) return;
    const res = await fetch(`/api/admin/quote-decisions/${id}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, new_price_cents: newPriceCents }),
    });
    const json = await res.json();
    if (json.error) {
      alert(json.error);
      return;
    }
    await load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Quote Exception Queue</h1>
      <div className="mb-4 flex gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">All open</option>
          <option value="manual_review">Manual review</option>
          <option value="needs_evidence">Needs evidence</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={load} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Refresh</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && decisions.length === 0 && <p>No quote decisions in this queue.</p>}
      <div className="space-y-3">
        {decisions.map((d) => (
          <div key={d.id} className="border rounded p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${stateBadge[d.state] || 'bg-gray-100'}`}>{d.state}</span>
                  <span className="text-sm text-gray-500">{d.quote_decision_ref}</span>
                </div>
                <p className="mt-1 text-sm"><strong>Price:</strong> {fmtCents(d.price_cents)} · <strong>Minimum:</strong> {fmtCents(d.minimum_price_cents)} · <strong>Exposure:</strong> {fmtCents(Math.max(0, d.minimum_price_cents - d.price_cents))}</p>
                <p className="text-sm text-gray-600 mt-1">{d.quote_snapshot?.address || 'No address'}</p>
              </div>
              {d.state === 'manual_review' && (
                <button
                  onClick={() => overrideDecision(d.id, d.minimum_price_cents)}
                  className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
                >
                  Approve at minimum
                </button>
              )}
            </div>
            {d.decision_reasons?.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {d.decision_reasons.map((r, i) => (
                  <li key={i}>{r.message}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
