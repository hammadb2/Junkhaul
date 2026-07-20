'use client';

import { useEffect, useState, useCallback } from 'react';

const DECISIONS = [
  { key: 'accept', label: 'Accept', color: '#22c55e' },
  { key: 'correct', label: 'Correct', color: '#f59e0b' },
  { key: 'request_photo', label: 'Request photo', color: '#3b82f6' },
  { key: 'reject', label: 'Reject', color: '#ef4444' },
];

export default function ItemEvidenceReview({ flash }) {
  const [observations, setObservations] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewerId, setReviewerId] = useState('');
  const [reason, setReason] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/review-queue?limit=50');
      const data = await res.json();
      if (res.ok) {
        setObservations(data.observations || []);
        if (selectedIndex >= (data.observations || []).length) setSelectedIndex(0);
      } else {
        setError(data.error || 'Failed to load review queue');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const submitDecision = async (decision) => {
    const obs = observations[selectedIndex];
    if (!obs || !reviewerId || !reason) {
      setError('Reviewer ID and reason are required.');
      return;
    }
    try {
      const res = await fetch('/api/admin/item-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation_id: obs.id,
          reviewer_id: reviewerId,
          decision,
          reason,
        }),
      });
      if (res.ok) {
        flash?.('Decision saved');
        setReason('');
        await fetchQueue();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save decision');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowRight') setSelectedIndex((i) => Math.min(i + 1, observations.length - 1));
    if (e.key === 'ArrowLeft') setSelectedIndex((i) => Math.max(i - 1, 0));
    if (e.key === 'a') submitDecision('accept');
    if (e.key === 'c') submitDecision('correct');
    if (e.key === 'r') submitDecision('reject');
    if (e.key === 'p') submitDecision('request_photo');
  }, [observations, selectedIndex, reviewerId, reason]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (loading) return <p>Loading review queue…</p>;
  if (error) return <p style={{ color: '#ef4444' }}>{error}</p>;
  if (observations.length === 0) return <p>No items requiring review.</p>;

  const obs = observations[selectedIndex];
  const mainPhoto = obs.photo_urls?.[0];

  return (
    <div style={{ padding: 24 }}>
      <h2>Item Evidence Review</h2>
      <div style={{ marginBottom: 12, fontSize: 14, color: '#6b7280' }}>
        {selectedIndex + 1} / {observations.length} · Keyboard: A accept, C correct, R reject, P request photo, ← → navigate
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt="item evidence"
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 8 }}
            />
          ) : (
            <div style={{ width: '100%', height: 300, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
              No photo
            </div>
          )}
          {obs.photo_urls?.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
              {obs.photo_urls.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>Booking: {obs.bookings?.name || obs.booking_id}</h3>
          <p>Address: {obs.bookings?.address || '—'}</p>
          <p>Status: <strong>{obs.status}</strong></p>
          {obs.item_hazards?.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', borderRadius: 8 }}>
              <strong>Hazards / flags</strong>
              <ul>
                {obs.item_hazards.map((h) => (
                  <li key={h.id}>{h.severity}: {h.hazard_type} — {h.description}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <h4>AI Estimates</h4>
            {obs.item_estimates?.map((e) => (
              <div key={e.id} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, fontSize: 14 }}>
                Weight: {e.weight_min_kg}–{e.weight_max_kg} kg (likely {e.weight_likely_kg} kg) ·
                Volume: {e.volume_min_cuft}–{e.volume_max_cuft} cu ft ·
                Tier: <strong>{e.evidence_tier}</strong> ·
                Stream: {e.pricing_stream}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>
              Reviewer ID
              <input value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
              Reason / correction note
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginLeft: 8, width: 300, padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {DECISIONS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => submitDecision(d.key)}
                  style={{ background: d.color, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 14px', cursor: 'pointer' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
