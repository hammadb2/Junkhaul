'use client';

import { useEffect, useState } from 'react';

// Refrigerant/freon photo-evidence review queue (Pricing Engine Phase 5).
// Every booking here has ALREADY been charged the full freon fee — a
// booking only shows up because the AI photo scan reported what might
// be a technician evacuation sticker. Verifying it here just records
// the decision; crediting the fee back to the customer is a manual
// finance step done separately.
export default function FreonEvidenceQueue({ flash }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review');
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/freon-evidence?status=${filter}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setBookings(json.bookings || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function review(bookingId, action) {
    const note = prompt(action === 'verify_freon_evidence' ? 'Verification note (optional):' : 'Rejection reason (optional):') || '';
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: { note } }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      flash?.(action === 'verify_freon_evidence' ? 'Marked verified — remember to process the fee credit manually' : 'Marked rejected — fee stands');
      await load();
    } catch (e) {
      flash?.(e.message, '#EF4444');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">Freon Evidence Queue</h1>
      <p className="text-sm text-gray-500 mb-4">
        The freon fee is already charged in full on every booking below. Verifying a sticker here does not auto-refund anything — it just records the decision for whoever processes the credit.
      </p>
      <div className="mb-4 flex gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="pending_review">Pending review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="not_claimed">Not claimed</option>
        </select>
        <button onClick={load} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Refresh</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && bookings.length === 0 && <p>Nothing in this queue.</p>}
      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="border rounded p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-medium">{b.name} — {b.booking_ref}</div>
                <p className="text-sm text-gray-600">{b.address}</p>
                <p className="text-sm mt-1">
                  <strong>Freon fee charged:</strong> ${Number(b.freon_fee || 0).toFixed(2)} ({b.freon_count} item{b.freon_count === 1 ? '' : 's'})
                </p>
                {b.freon_evacuation_review_note && (
                  <p className="text-sm text-gray-500 mt-1">Note: {b.freon_evacuation_review_note}</p>
                )}
                {b.photos?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {b.photos.slice(0, 6).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="Booking photo" className="w-20 h-20 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {filter === 'pending_review' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => review(b.id, 'verify_freon_evidence')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    Verify sticker
                  </button>
                  <button onClick={() => review(b.id, 'reject_freon_evidence')} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">
                    Not valid
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
