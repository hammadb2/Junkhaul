'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// /track/[booking_id] — live crew tracking page (mobile web)
// Customer opens via SMS link. Shows crew position + ETA.
// Updates via Supabase Realtime — no polling.
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function TrackPage({ params }) {
  const { booking_id } = params;
  const [booking, setBooking] = useState(null);
  const [crewLoc, setCrewLoc] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, en_route, arrived, in_progress, complete
  const mapRef = useRef(null);
  const supabaseRef = useRef(null);

  // Fetch booking + initial crew location
  useEffect(() => {
    fetch(`/api/crew/track/${booking_id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.booking) {
          setBooking(d.booking);
          setStatus(d.booking.crew_status || 'confirmed');
        }
        if (d.crew_location) {
          setCrewLoc(d.crew_location);
        }
      })
      .catch(() => {})
      .finally(() => setStatus((s) => (s === 'loading' ? 'en_route' : s)));
  }, [booking_id]);

  // Realtime subscription on crew_location
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
    });
    supabaseRef.current = sb;

    const channel = sb
      .channel(`track-${booking_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crew_location',
          filter: `active_booking_id=eq.${booking_id}`,
        },
        (payload) => {
          setCrewLoc(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${booking_id}`,
        },
        (payload) => {
          if (payload.new?.crew_status) setStatus(payload.new.crew_status);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [booking_id]);

  if (!booking) {
    return (
      <div style={styles.screen}>
        <p style={styles.muted}>Loading your tracking link…</p>
      </div>
    );
  }

  const etaMins = crewLoc ? estimateEta(crewLoc, booking) : null;

  return (
    <div style={styles.screen}>
      {/* Map placeholder — in production this is a Mapbox GL JS map */}
      <div style={styles.mapArea}>
        <MapPlaceholder crewLoc={crewLoc} booking={booking} status={status} />
      </div>

      {/* Status pill */}
      <div style={styles.statusPill}>
        {status === 'en_route' && `🚛 En Route · ETA ${etaMins || '—'} min`}
        {status === 'arrived' && '🎉 Your crew has arrived!'}
        {status === 'in_progress' && '📦 Job in progress'}
        {status === 'complete' && '✅ All done! Check your email for the receipt.'}
      </div>

      {/* Bottom sheet */}
      <div style={styles.sheet}>
        <div style={styles.brand}>
          <span style={styles.brandLogo}>🚛</span>
          <span style={styles.brandText}>JUNK HAUL CALGARY</span>
        </div>

        <h1 style={styles.headline}>
          {status === 'en_route' && 'Your crew is on the way'}
          {status === 'arrived' && 'Your crew has arrived! 🎉'}
          {status === 'in_progress' && 'Job in progress'}
          {status === 'complete' && 'All done!'}
        </h1>

        {booking.name && <p style={styles.crewName}>Coming to you for {booking.name}</p>}

        <p style={styles.address}>{booking.address}</p>

        <a href="tel:+15873250751" style={styles.callLink}>
          📞 (587) 325-0751 — Call us if anything changes
        </a>
      </div>
    </div>
  );
}

function MapPlaceholder({ crewLoc, booking, status }) {
  // In production: Mapbox GL JS with dark tiles, truck marker, destination pin.
  // For now, a styled placeholder showing the concept.
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {crewLoc ? (
        <>
          <div style={{ fontSize: 48, animation: 'pulse 2s infinite' }}>🚛</div>
          <p style={{ color: '#F97316', fontFamily: 'Menlo', fontSize: 14, marginTop: 8 }}>
            {crewLoc.latitude?.toFixed(4)}, {crewLoc.longitude?.toFixed(4)}
          </p>
        </>
      ) : (
        <div style={{ fontSize: 48 }}>📍</div>
      )}
      {booking && (
        <div style={{ position: 'absolute', bottom: 20, fontSize: 32 }}>🏠</div>
      )}
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
    </div>
  );
}

function estimateEta(crewLoc, booking) {
  if (!crewLoc || !booking.lat || !booking.lng) return null;
  const dist = haversineKm(crewLoc.latitude, crewLoc.longitude, booking.lat, booking.lng);
  // Assume 40 km/h average city driving
  return Math.max(1, Math.round((dist / 40) * 60));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

const styles = {
  screen: { background: '#0D0D0D', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column' },
  mapArea: { height: '60vh', width: '100%', position: 'relative' },
  statusPill: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,13,13,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 999, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' },
  sheet: { background: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, flex: 1 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  brandLogo: { fontSize: 24 },
  brandText: { fontSize: 14, fontWeight: 700, letterSpacing: 1, color: '#F97316' },
  headline: { fontSize: 22, fontWeight: 700, margin: '0 0 8px 0' },
  crewName: { color: '#A3A3A3', fontSize: 15, margin: '0 0 12px 0' },
  address: { color: '#fff', fontSize: 16, margin: '0 0 20px 0' },
  callLink: { color: '#F97316', fontSize: 14, textDecoration: 'none', display: 'block' },
  muted: { color: '#A3A3A3', textAlign: 'center', paddingTop: 40 },
};
