'use client';

import { useState, useEffect } from 'react';

// ============================================================
// /photos/[booking_id]/arrival — customer-facing photo viewer
// Shows pre-job arrival photos sent via SMS. Public via booking UUID.
// ============================================================

export default function ArrivalPhotosPage({ params }) {
  const { booking_id } = params;
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/crew/photos/${booking_id}`)
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [booking_id]);

  if (loading) {
    return (
      <div style={styles.screen}>
        <p style={styles.muted}>Loading photos…</p>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <span style={styles.brand}>🚛 JUNK HAUL CALGARY</span>
        <h1 style={styles.title}>Pre-Job Photos</h1>
        <p style={styles.muted}>
          These photos were taken by our crew before starting your pickup.
          They document the condition of your space.
        </p>
      </div>

      {photos.length === 0 ? (
        <p style={styles.muted}>No photos available yet.</p>
      ) : (
        <div style={styles.grid}>
          {photos.map((p, i) => (
            <div key={i} style={styles.photoCard}>
              <img src={p.url} alt={`Photo ${i + 1}`} style={styles.photo} />
              <p style={styles.timestamp}>{new Date(p.taken_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <p style={styles.footer}>junkhaul.ca · (587) 325-0751</p>
    </div>
  );
}

const styles = {
  screen: { background: '#0D0D0D', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, system-ui, sans-serif', padding: 20, maxWidth: 600, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: 24 },
  brand: { fontSize: 14, fontWeight: 700, letterSpacing: 1, color: '#F97316' },
  title: { fontSize: 22, fontWeight: 700, margin: '12px 0 8px 0' },
  muted: { color: '#A3A3A3', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 },
  photoCard: { background: '#1A1A1A', borderRadius: 12, overflow: 'hidden' },
  photo: { width: '100%', display: 'block' },
  timestamp: { color: '#A3A3A3', fontSize: 11, padding: 8, margin: 0 },
  footer: { color: '#A3A3A3', fontSize: 12, textAlign: 'center', marginTop: 32 },
};
