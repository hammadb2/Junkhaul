'use client';

import { useEffect, useState } from 'react';

export default function AIQualityPanel() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-quality?period=daily&limit=30');
      const data = await res.json();
      if (res.ok) setSnapshots(data.snapshots || []);
      else setError(data.error || 'Failed to load snapshots');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSnapshot = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/ai-quality', { method: 'POST', body: JSON.stringify({ period: 'daily' }) });
      if (res.ok) await fetchSnapshots();
      else {
        const data = await res.json();
        setError(data.error || 'Failed to generate snapshot');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  if (loading && snapshots.length === 0) return <p>Loading…</p>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>AI Model Quality</h2>
        <button onClick={generateSnapshot} disabled={generating} style={{ padding: '8px 16px' }}>
          {generating ? 'Generating…' : 'Generate daily snapshot'}
        </button>
      </div>
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      {snapshots.length === 0 ? (
        <p>No snapshots yet. Generate one to begin tracking.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {snapshots.map((s) => (
            <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{new Date(s.period_start).toLocaleDateString()}</div>
              <div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                <div>Total: <strong>{s.total_analyses}</strong></div>
                <div>Auto-approved: <strong>{s.auto_approved_count}</strong></div>
                <div>Manual corrections: <strong>{s.manual_correction_count}</strong></div>
                <div>Underestimates: <strong>{s.underestimation_count}</strong></div>
                <div>Range coverage: <strong>{s.range_coverage_percent}%</strong></div>
                <div>Failures: <strong>{s.provider_failure_count}</strong></div>
                <div>Avg latency: <strong>{s.avg_latency_ms ?? '—'} ms</strong></div>
                <div>Avg cost: <strong>{s.avg_cost_cents ? `$${(s.avg_cost_cents / 100).toFixed(2)}` : '—'}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
