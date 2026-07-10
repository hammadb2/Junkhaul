'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// /portal/schedule — Uber Driver-style map-first schedule.
// Top half: live Mapbox map with route + ETA.
// Bottom half: scrollable job cards.
// Keeps all existing API calls and job-clock logic.
// ============================================================

const STATUS_STYLES = {
  confirmed: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // booking_id being toggled
  const [now, setNow] = useState(Date.now());

  // Map state
  const [mapReady, setMapReady] = useState(false);
  const [crewPos, setCrewPos] = useState(null); // {lat, lng}
  const [jobCoords, setJobCoords] = useState({}); // booking_id -> [lng, lat]
  const [routeInfo, setRouteInfo] = useState(null); // {eta, distance, geometry}
  const [locPerm, setLocPerm] = useState('default'); // 'default' | 'granted' | 'denied'
  const [showLocPrompt, setShowLocPrompt] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const crewMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  // Tick every second for live job timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- Location permission + watch ----------
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    const stored = localStorage.getItem('jh-location-granted');
    if (stored === 'true') {
      setLocPerm('granted');
      startWatch();
    } else if (stored === 'false') {
      setLocPerm('denied');
    } else {
      // Check actual permission state if available
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((p) => {
            if (p.state === 'granted') {
              setLocPerm('granted');
              localStorage.setItem('jh-location-granted', 'true');
              startWatch();
            } else if (p.state === 'denied') {
              setLocPerm('denied');
              localStorage.setItem('jh-location-granted', 'false');
            } else {
              setLocPerm('default');
              setShowLocPrompt(true);
            }
          })
          .catch(() => setShowLocPrompt(true));
      } else {
        setShowLocPrompt(true);
      }
    }
    return () => stopWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWatch = () => {
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCrewPos(p);
        // Throttled POST to /api/employee/location
        const ts = Date.now();
        if (ts - lastSentRef.current >= 30000) {
          lastSentRef.current = ts;
          fetch('/api/employee/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            }),
          }).catch(() => {});
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocPerm('denied');
          localStorage.setItem('jh-location-granted', 'false');
          stopWatch();
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  };

  const stopWatch = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const enableLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocPerm('granted');
        localStorage.setItem('jh-location-granted', 'true');
        setShowLocPrompt(false);
        setCrewPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        startWatch();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocPerm('denied');
          localStorage.setItem('jh-location-granted', 'false');
          setShowLocPrompt(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  };

  // ---------- Load Mapbox GL JS ----------
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (window.mapboxgl) {
      setMapReady(true);
      return;
    }
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.5.2/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.5.2/mapbox-gl.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // ---------- Init map ----------
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.mapboxgl) return;
    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new window.mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-114.0719, 51.0447], // Calgary
      zoom: 11,
    });
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
      crewMarkerRef.current = null;
    };
  }, [mapReady]);

  // ---------- Geocode job addresses ----------
  const geocodeAddress = async (address) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const d = await res.json();
      if (d.features && d.features[0]) return d.features[0].center; // [lng, lat]
    } catch {}
    return null;
  };

  const bookings = data?.bookings || [];

  useEffect(() => {
    if (!mapReady || !MAPBOX_TOKEN || bookings.length === 0) return;
    let cancelled = false;
    (async () => {
      const coords = {};
      for (const b of bookings) {
        if (!b.address) continue;
        const c = await geocodeAddress(b.address);
        if (cancelled) return;
        if (c) coords[b.id] = c;
      }
      if (!cancelled) setJobCoords(coords);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, JSON.stringify(bookings.map((b) => b.id + b.address))]);

  // ---------- Update markers on map ----------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !window.mapboxgl) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Job markers
    bookings.forEach((b, idx) => {
      const c = jobCoords[b.id];
      if (!c) return;
      const el = document.createElement('div');
      const isActive = idx === currentJobIndex;
      el.innerHTML = `<div style="width:${isActive ? 38 : 32}px;height:${isActive ? 38 : 32}px;background:#f97316;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:700;font-size:14px;">${idx + 1}</span></div>`;
      const marker = new window.mapboxgl.Marker(el).setLngLat(c).addTo(map);
      markersRef.current.push(marker);
    });

    // Crew marker
    if (crewPos) {
      if (crewMarkerRef.current) crewMarkerRef.current.remove();
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:20px;height:20px;background:#1f2937;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`;
      crewMarkerRef.current = new window.mapboxgl.Marker(el)
        .setLngLat([crewPos.lng, crewPos.lat])
        .addTo(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, jobCoords, crewPos]);

  // ---------- Compute current/next job ----------
  const currentJobIndex = bookings.findIndex(
    (b) => b.status === 'in_progress' || b.status === 'confirmed' || b.status === 'scheduled'
  );
  const nextJob = currentJobIndex >= 0 ? bookings[currentJobIndex] : null;

  // ---------- Draw route + ETA ----------
  const drawRoute = useCallback(
    async (fromLng, fromLat, toLng, toLat) => {
      const map = mapInstanceRef.current;
      if (!map || !MAPBOX_TOKEN) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}.json?access_token=${MAPBOX_TOKEN}&geometries=geojson`
        );
        const d = await res.json();
        if (d.routes && d.routes[0]) {
          const route = d.routes[0];
          setRouteInfo({
            eta: Math.round(route.duration / 60),
            distance: (route.distance / 1000).toFixed(1),
            geometry: route.geometry,
          });
          if (map.getSource('route')) {
            map.getSource('route').setData({
              type: 'Feature',
              geometry: route.geometry,
            });
          } else {
            map.addSource('route', {
              type: 'geojson',
              data: { type: 'Feature', geometry: route.geometry },
            });
            map.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              paint: { 'line-color': '#f97316', 'line-width': 5 },
            });
          }
        }
      } catch {}
    },
    []
  );

  useEffect(() => {
    if (!mapReady || !crewPos || !nextJob) return;
    const dest = jobCoords[nextJob.id];
    if (!dest) return;
    drawRoute(crewPos.lng, crewPos.lat, dest[0], dest[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, crewPos, nextJob?.id, jobCoords[nextJob?.id]]);

  // ---------- Navigate (open in maps app) ----------
  const openInMaps = (lat, lng) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `https://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const navigateToJob = (b) => {
    const c = jobCoords[b.id];
    if (c) {
      openInMaps(c[1], c[0]);
    } else if (b.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(b.address)}`, '_blank');
    }
  };

  // ---------- Data loading ----------
  const loadMe = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return null; }
    const d = await res.json();
    setEmp(d.employee);
    return d.employee;
  }, [router]);

  const loadSchedule = useCallback(async () => {
    const res = await fetch('/api/employee/schedule');
    if (res.status === 401) { router.push('/portal'); return; }
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadMe(); loadSchedule(); }, [loadMe, loadSchedule]);

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  const jobClock = async (bookingId, action) => {
    setBusy(bookingId); setError('');
    const res = await fetch('/api/employee/job-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, action }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) { setError(d.error || 'Action failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    loadSchedule();
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <main className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </main>
    );
  }

  const assignment = data?.assignment || null;
  const partner = data?.partner || null;
  const openSessions = data?.open_sessions || [];
  const completedSessions = data?.completed_sessions || [];

  const openSessionFor = (bookingId) =>
    openSessions.find((s) => s.booking_id === bookingId);

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // End of day stats
  const jobsCompleted = bookings.filter((b) => b.status === 'completed').length;
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0), 0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);
  const receiptsTotal = 0;

  const fmtDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const clockedIn = !!(emp?.clock_in_at && !emp?.clock_out_at);

  return (
    <main className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header with safe-top */}
      <header className="safe-top bg-white border-b border-gray-200 px-4 pb-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${clockedIn ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">{emp?.name || 'Crew'}</div>
            <div className="text-[11px] text-gray-400 leading-tight">{today}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.push('/portal/clock')} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 active:scale-95 transition" aria-label="Clock">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
          </button>
          <button onClick={() => router.push('/portal/documents')} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 active:scale-95 transition" aria-label="Docs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 001 1h4" /><path d="M5 3h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinejoin="round" /><path d="M9 13h6M9 17h6" strokeLinecap="round" /></svg>
          </button>
          <button onClick={() => router.push('/portal/paystubs')} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 active:scale-95 transition" aria-label="Pay">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" strokeLinecap="round" /></svg>
          </button>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 active:scale-95 transition" aria-label="Logout">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 12H3M11 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2">{error}</div>
      )}

      {/* ===== Map (top 45vh) ===== */}
      <div className="relative" style={{ height: '45vh', minHeight: 280 }}>
        {MAPBOX_TOKEN && mapReady ? (
          <>
            <div ref={mapRef} className="w-full h-full" />
            {/* Floating ETA card */}
            {routeInfo && nextJob && (
              <div className="absolute top-3 left-3 right-3 bg-white rounded-2xl shadow-lg px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">Next: {nextJob.name}</div>
                  <div className="font-bold text-gray-900 text-sm">
                    {routeInfo.eta} min · {routeInfo.distance} km
                  </div>
                </div>
                <button
                  onClick={() => navigateToJob(nextJob)}
                  className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition"
                >
                  Navigate
                </button>
              </div>
            )}
            {/* Location off indicator */}
            {locPerm === 'denied' && (
              <div className="absolute bottom-3 left-3 bg-white/90 rounded-full px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Location off
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-500">
            {showLocPrompt ? (
              <div className="text-center px-6">
                <div className="text-sm font-medium mb-2">Enable location for live maps</div>
                <button
                  onClick={enableLocation}
                  className="bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition"
                >
                  Enable
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-400">Enable location for live maps</div>
            )}
          </div>
        )}
      </div>

      {/* ===== Job cards (scrollable bottom) ===== */}
      <div className="flex-1 overflow-y-auto pb-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
        <div className="max-w-md mx-auto px-4 pt-4 space-y-3">

          {/* Location prompt card (one-time) */}
          {showLocPrompt && locPerm === 'default' && (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Enable location for live tracking and directions</div>
                  <div className="text-xs text-gray-400 mt-1">We use your location to show the route to your next job.</div>
                  <button
                    onClick={enableLocation}
                    className="mt-3 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition"
                  >
                    Enable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No assignment */}
          {!assignment && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="text-gray-400 text-sm">No assignment scheduled for today.</div>
              <button
                onClick={() => router.push('/portal/clock')}
                className="mt-4 text-orange-600 font-semibold text-sm underline"
              >
                Go to Clock
              </button>
            </div>
          )}

          {/* Assignment + Partner compact card */}
          {assignment && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Today&apos;s Assignment</div>
                  <div className="font-bold text-gray-900 text-sm mt-0.5">{today}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-400">Pickup</div>
                  <div className="text-gray-700 font-medium">{assignment.uhaul_location || assignment.pickup_location || '—'}</div>
                </div>
              </div>
              {partner && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Partner</div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {partner.name || `${partner.first_name || ''} ${partner.last_name || ''}`.trim()}
                    </div>
                  </div>
                  {partner.phone && (
                    <a
                      href={`tel:${partner.phone}`}
                      className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition"
                    >
                      Call
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Truck check section */}
          {assignment && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Truck Check</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=pickup`)}
                  disabled={bookings.length === 0}
                  className="bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition"
                >
                  Truck Pickup
                </button>
                <button
                  onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=return`)}
                  disabled={bookings.length === 0}
                  className="bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition"
                >
                  Truck Return
                </button>
              </div>
            </div>
          )}

          {/* Job cards */}
          {assignment && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">
                Jobs ({bookings.length})
              </div>
              <div className="space-y-3">
                {bookings.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center text-gray-400 text-sm">
                    No jobs scheduled today.
                  </div>
                )}
                {bookings.map((b, idx) => {
                  const open = openSessionFor(b.id);
                  const inProgress = !!open || b.status === 'in_progress';
                  const completed = b.status === 'completed';
                  const isNext = idx === currentJobIndex;
                  const items = Array.isArray(b.itemized_items)
                    ? b.itemized_items
                    : (typeof b.itemized_items === 'string'
                        ? (() => { try { return JSON.parse(b.itemized_items); } catch { return []; } })()
                        : []);
                  return (
                    <div
                      key={b.id}
                      className={`bg-white rounded-2xl shadow-sm border-2 p-4 transition ${
                        isNext && !completed ? 'border-orange-500' : 'border-gray-200'
                      }`}
                    >
                      {/* Status + time */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-500">{b.time_slot || 'Time TBD'}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Customer */}
                      <div className="font-bold text-gray-900">{b.name}</div>
                      <div className="mt-1 space-y-1 text-sm">
                        {b.phone && (
                          <a href={`tel:${b.phone}`} className="block text-orange-600 font-medium">
                            {b.phone}
                          </a>
                        )}
                        {b.address && (
                          <div className="text-gray-700">{b.address}</div>
                        )}
                      </div>

                      {/* Price + load size */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-400">Total</div>
                          <div className="font-bold text-gray-900">${Number(b.total_price || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Load size</div>
                          <div className="font-medium text-gray-900">{b.load_size || '—'}</div>
                        </div>
                      </div>

                      {/* Itemized items */}
                      {items.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-400 mb-1">Items</div>
                          <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
                            {items.map((it, i) => (
                              <li key={i}>
                                {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}× ${it.name || it.item || it.description || ''}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notes */}
                      {b.notes && (
                        <div className="mt-3 bg-amber-50 rounded-lg p-2 text-sm text-amber-800">
                          <span className="font-medium">Notes: </span>{b.notes}
                        </div>
                      )}

                      {/* Live timer */}
                      {inProgress && open && (
                        <div className="mt-3 text-center">
                          <div className="text-2xl font-mono font-bold text-amber-600 tabular-nums">
                            {fmtDuration(now - new Date(open.clock_in_at).getTime())}
                          </div>
                          <div className="text-xs text-gray-400">job in progress</div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex gap-2">
                        {!completed && !inProgress && (
                          <button
                            onClick={() => jobClock(b.id, 'in')}
                            disabled={busy === b.id}
                            className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-[0.98] transition"
                          >
                            {busy === b.id ? '…' : 'Start Job'}
                          </button>
                        )}
                        {inProgress && (
                          <button
                            onClick={() => jobClock(b.id, 'out')}
                            disabled={busy === b.id}
                            className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-[0.98] transition"
                          >
                            {busy === b.id ? '…' : 'End Job'}
                          </button>
                        )}
                        {b.address && (
                          <button
                            onClick={() => navigateToJob(b)}
                            className="flex-1 bg-white border border-orange-300 text-orange-600 font-semibold py-3 rounded-xl text-sm active:scale-[0.98] transition"
                          >
                            Navigate
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/portal/job?booking_id=${b.id}`)}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm active:scale-[0.98] transition"
                        >
                          Job Flow ›
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* End of day summary */}
          {assignment && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">End of Day</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{jobsCompleted}</div>
                  <div className="text-xs text-gray-400">jobs done</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalHours}</div>
                  <div className="text-xs text-gray-400">hours</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">${receiptsTotal.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">receipts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
