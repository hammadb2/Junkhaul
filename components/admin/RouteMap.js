'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEPOT = { lat: 51.0595, lng: -114.0447 };

const numberIcon = (label, color) =>
  L.divIcon({
    className: 'jh-marker',
    html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export default function RouteMap({ stops = [] }) {
  const located = stops.filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
  );
  const center = located[0]
    ? [located[0].lat, located[0].lng]
    : [DEPOT.lat, DEPOT.lng];

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: '320px', width: '100%', borderRadius: '16px' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[DEPOT.lat, DEPOT.lng]} icon={numberIcon('🏠', '#111827')}>
        <Popup>U-Haul depot — 2615 12 St NE</Popup>
      </Marker>
      {located.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={numberIcon(s.position, '#f97316')}>
          <Popup>
            <b>#{s.position} · {s.name}</b>
            <br />
            {s.address}
            <br />
            {s.job_time}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
