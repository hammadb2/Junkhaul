'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Calgary downtown center
const CALGARY_CENTER = [51.0447, -114.0719];
const DEPOT = { lat: 51.0595, lng: -114.0447 };

// Create a truck marker icon for each crew member
const truckIcon = (initial, color = '#f97316') =>
  L.divIcon({
    className: 'jh-crew-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="background:${color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);">
          ${initial}
        </div>
        <div style="width:8px;height:8px;border-radius:50%;background:#22C55E;border:2px solid #fff;margin-top:-2px;box-shadow:0 0 6px rgba(34,197,94,.6);animation:jh-pulse 1.5s infinite;"></div>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 20],
  });

const depotIcon = L.divIcon({
  className: 'jh-depot-marker',
  html: `<div style="background:#1a1a1a;color:#fff;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">🏠</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const severityColor = (updatedAt) => {
  const ageMin = (Date.now() - new Date(updatedAt).getTime()) / 60000;
  if (ageMin < 2) return '#22C55E'; // green — very recent
  if (ageMin < 5) return '#F59E0B'; // amber — somewhat recent
  return 'rgba(0,0,0,.3)'; // gray — stale
};

const ageLabel = (updatedAt) => {
  const ageSec = Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000);
  if (ageSec < 60) return `${ageSec}s ago`;
  const ageMin = Math.round(ageSec / 60);
  if (ageMin < 60) return `${ageMin}m ago`;
  return `${Math.round(ageMin / 60)}h ago`;
};

export default function LiveCrewMap({ height = 400 }) {
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  const fetchCrews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crew-locations');
      if (!res.ok) throw new Error('Failed to fetch crew locations');
      const data = await res.json();
      setCrews(data.crews || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    fetchCrews();
    const interval = setInterval(fetchCrews, 5000);
    return () => clearInterval(interval);
  }, [fetchCrews]);

  // Fit bounds when crews first load
  useEffect(() => {
    if (crews.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(
        crews.map((c) => [c.lat, c.lng]).concat([[DEPOT.lat, DEPOT.lng]])
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [crews.length > 0]); // only on first load

  const crewName = (c) => {
    const emp = c.employees;
    if (!emp) return 'Unknown';
    return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
  };

  const crewInitial = (c) => {
    const name = crewName(c);
    return name[0]?.toUpperCase() || '?';
  };

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes jh-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      <MapContainer
        center={CALGARY_CENTER}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: `${height}px`, width: '100%', borderRadius: '14px' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Depot marker */}
        <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon}>
          <Popup>U-Haul depot, 2615 12 St NE</Popup>
        </Marker>

        {/* Crew markers */}
        {crews.map((c) => {
          const pos = [c.lat, c.lng];
          const color = severityColor(c.updated_at);
          return (
            <Marker
              key={c.employee_id}
              position={pos}
              icon={truckIcon(crewInitial(c), '#f97316')}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong style={{ fontSize: 13 }}>{crewName(c)}</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: 11 }}>
                    Updated {ageLabel(c.updated_at)}
                  </span>
                  {c.speed != null && (
                    <>
                      <br />
                      <span style={{ color: '#666', fontSize: 11 }}>
                        Speed: {Math.round(c.speed)} km/h
                      </span>
                    </>
                  )}
                  {c.assignment?.bookings && (
                    <>
                      <br />
                      <span style={{ color: '#f97316', fontSize: 11, fontWeight: 600 }}>
                        Current job: {c.assignment.bookings.name || c.assignment.bookings.address}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Overlay: crew count + last update */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(255,255,255,.95)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#1a1a1a',
        boxShadow: '0 2px 8px rgba(0,0,0,.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: loading ? '#F59E0B' : '#22C55E',
          animation: 'jh-pulse 1.5s infinite',
        }} />
        {loading ? 'Loading…' : `${crews.length} crew${crews.length === 1 ? '' : 's'} active`}
        {lastUpdate && (
          <span style={{ color: 'rgba(0,0,0,.4)', fontWeight: 400, fontSize: 11 }}>
            · {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!loading && crews.length === 0 && !error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,.8)',
          borderRadius: '14px',
          zIndex: 1000,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
              No active crew locations
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.45)' }}>
              Crew positions will appear here when they start their shifts.
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(239,68,68,.95)',
          color: '#fff',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          zIndex: 1000,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
