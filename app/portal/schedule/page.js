'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Wallet, LogOut, MapPin, Navigation, Phone, Truck, Calendar, CheckCircle, ChevronDown, StickyNote, MapPinOff, Bell, AlertTriangle } from 'lucide-react';

// ============================================================
// /portal/schedule — Uber Driver-style map-first schedule.
// Dark theme. Draggable bottom sheet. Floating glass header.
// Keeps all existing API calls and job-clock logic.
// ============================================================

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
  scheduled: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
  in_progress: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  completed: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', border: 'rgba(34,197,94,0.3)' },
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Map state
  const [mapReady, setMapReady] = useState(false);
  const [crewPos, setCrewPos] = useState(null);
  const [jobCoords, setJobCoords] = useState({});
  const [routeInfo, setRouteInfo] = useState(null);
  const [locPerm, setLocPerm] = useState('default');
  const [showLocPrompt, setShowLocPrompt] = useState(false);

  // Bottom sheet state
  const [sheetState, setSheetState] = useState('collapsed'); // 'collapsed' | 'half' | 'full'
  const [dragY, setDragY] = useState(null);
  const sheetStartY = useRef(0);

  // Expanded items/notes
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});

  // End of day celebration
  const [showEOD, setShowEOD] = useState(false);

  // Notification badge count
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Weekly view
  const [showWeekly, setShowWeekly] = useState(false);
  const [weekData, setWeekData] = useState(null);

  // Online status
  const [isOnline, setIsOnline] = useState(true);

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
      center: [-114.0719, 51.0447],
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
      if (d.features && d.features[0]) return d.features[0].center;
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

  // ---------- Compute current/next job ----------
  const currentJobIndex = bookings.findIndex(
    (b) => b.status === 'in_progress' || b.status === 'confirmed' || b.status === 'scheduled'
  );
  const nextJob = currentJobIndex >= 0 ? bookings[currentJobIndex] : null;

  // ---------- Update markers on map ----------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !window.mapboxgl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    bookings.forEach((b, idx) => {
      const c = jobCoords[b.id];
      if (!c) return;
      const el = document.createElement('div');
      const isActive = idx === currentJobIndex;
      const size = isActive ? 38 : 32;
      el.innerHTML = `<div style="width:${size}px;height:${size}px;background:#f97316;border-radius:50% 50% 50% 0;transform:rotate(-45deg);${isActive ? 'animation:gentle-bounce 2s ease-in-out infinite;' : ''}border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:700;font-size:14px;">${idx + 1}</span></div>`;
      const marker = new window.mapboxgl.Marker(el).setLngLat(c).addTo(map);
      markersRef.current.push(marker);
    });

    if (crewPos) {
      if (crewMarkerRef.current) crewMarkerRef.current.remove();
      const el = document.createElement('div');
      el.innerHTML = `<div style="position:relative;width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.6);"><div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;background:rgba(59,130,246,0.3);animation:pulse-ring 2s ease-out infinite;"></div></div>`;
      crewMarkerRef.current = new window.mapboxgl.Marker(el)
        .setLngLat([crewPos.lng, crewPos.lat])
        .addTo(map);
    }

    // Auto-fit bounds
    if (crewPos && bookings.length > 0) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([crewPos.lng, crewPos.lat]);
      bookings.forEach((b) => {
        const c = jobCoords[b.id];
        if (c) bounds.extend(c);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, jobCoords, crewPos]);

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
              paint: { 'line-color': '#f97316', 'line-width': 5, 'line-opacity': 0.8 },
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
    if (d.employee && !d.employee.onboarded) {
      router.push('/portal/onboard');
      return null;
    }
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

  // Fetch unread notification count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/employee/notifications');
        if (res.ok) { const d = await res.json(); setUnreadNotifs(d.unread || 0); }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weekly data when toggled
  useEffect(() => {
    if (!showWeekly) return;
    const fetchWeek = async () => {
      try {
        const res = await fetch('/api/employee/schedule?weekly=true');
        if (res.ok) { const d = await res.json(); setWeekData(d.week || []); }
      } catch {}
    };
    fetchWeek();
  }, [showWeekly]);

  // Track online/offline status
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

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

  // ---------- Bottom sheet drag handlers ----------
  const onTouchStart = (e) => {
    sheetStartY.current = e.touches[0].clientY;
    setDragY(sheetStartY.current);
  };

  const onTouchMove = (e) => {
    setDragY(e.touches[0].clientY);
  };

  const onTouchEnd = (e) => {
    const deltaY = sheetStartY.current - (dragY || sheetStartY.current);
    if (deltaY > 50) {
      // Dragged up
      if (sheetState === 'collapsed') setSheetState('half');
      else if (sheetState === 'half') setSheetState('full');
    } else if (deltaY < -50) {
      // Dragged down
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') setSheetState('collapsed');
    }
    setDragY(null);
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div style={{ color: 'rgba(0,0,0,.4)' }}>Loading...</div>
      </main>
    );
  }

  // ---------- Location required gate ----------
  if (locPerm === 'denied') {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 safe-top safe-bottom" style={{ background: '#FAFAFA' }}>
        <div className="max-w-sm w-full text-center">
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <MapPinOff size={40} color="#EF4444" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Location Required</div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginBottom: 24, lineHeight: 1.5 }}>
            Junk Haul Crew needs your location to track jobs, navigate to customers, and share ETA with clients. Without location access, the app cannot function.
          </div>
          <div className="dark-card p-5 text-left space-y-3">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>To enable location:</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><strong style={{ color: 'rgba(255,255,255,0.8)' }}>iPhone:</strong> Settings &rarr; JunkHaul &rarr; Location &rarr; Allow</div>
              <div><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Android:</strong> Settings &rarr; Apps &rarr; JunkHaul &rarr; Permissions &rarr; Location &rarr; Allow</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('jh-location-granted');
                setLocPerm('default');
                setShowLocPrompt(true);
              }}
              className="btn-primary w-full"
              style={{ minHeight: 48, marginTop: 8 }}
            >
              Try Again
            </button>
            <button
              onClick={logout}
              style={{ width: '100%', color: 'rgba(0,0,0,.4)', fontWeight: 500, padding: '8px 0', fontSize: 14, background: 'transparent', border: 'none' }}
            >
              Log out
            </button>
          </div>
        </div>
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

  const jobsCompleted = bookings.filter((b) => b.status === 'completed').length;
  const allDone = assignment && bookings.length > 0 && jobsCompleted === bookings.length;
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0), 0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  const fmtDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const clockedIn = !!(data?.open_shift);

  // Sheet height based on state
  const sheetHeights = { collapsed: 130, half: '50%', full: '85%' };
  const sheetHeight = sheetHeights[sheetState];

  return (
    <main className="min-h-dvh flex flex-col" style={{ background: '#FAFAFA' }}>
      {/* ===== Map (top ~55%) ===== */}
      <div className="relative" style={{ height: '55vh', minHeight: 300 }}>
        {MAPBOX_TOKEN && mapReady ? (
          <>
            <div ref={mapRef} className="w-full h-full" />
            {/* Floating ETA pill on map */}
            {routeInfo && nextJob && (
              <button
                onClick={() => navigateToJob(nextJob)}
                className="fade-in"
                style={{
                  position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
                  borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
                  border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Next: {nextJob.name}</span>
                <span className="tabular" style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                  {routeInfo.eta} min · {routeInfo.distance} km
                </span>
                <Navigation size={18} color="#f97316" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: '#fff' }}>
            {showLocPrompt ? (
              <div className="text-center px-6">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <MapPin size={28} color="#f97316" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Enable Location</div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 16 }}>See your route and navigate to jobs.</div>
                <button onClick={enableLocation} className="btn-primary" style={{ minHeight: 48, padding: '12px 24px' }}>
                  Enable Location
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,.4)' }}>Loading map...</div>
            )}
          </div>
        )}

        {/* ===== Floating glass header over map ===== */}
        <header className="glass-bar safe-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot" style={{ background: clockedIn ? '#22C55E' : '#6B7280' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {emp?.name || 'Crew'}
                {!isOnline && <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 4 }}>OFFLINE</span>}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', lineHeight: 1.2 }}>{today}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/portal/notifications')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} aria-label="Notifications">
              <Bell size={20} color="rgba(0,0,0,.6)" />
              {unreadNotifs > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: '#f97316', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
              )}
            </button>
            <button onClick={() => router.push('/portal/clock')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Shift status">
              <Clock size={20} color="rgba(0,0,0,.6)" />
            </button>
            <button onClick={() => router.push('/portal/documents')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Docs">
              <FileText size={20} color="rgba(0,0,0,.6)" />
            </button>
            <button onClick={() => router.push('/portal/paystubs')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Pay">
              <Wallet size={20} color="rgba(0,0,0,.6)" />
            </button>
            <button onClick={() => router.push('/portal/incidents')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Incidents">
              <AlertTriangle size={20} color="rgba(0,0,0,.5)" />
            </button>
            <button onClick={logout} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Logout">
              <LogOut size={20} color="rgba(0,0,0,.5)" />
            </button>
          </div>
        </header>
      </div>

      {/* ===== Draggable bottom sheet ===== */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          marginTop: -20,
          zIndex: 20,
          background: '#FAFAFA',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid rgba(0,0,0,.06)',
          maxHeight: sheetHeight,
          transition: dragY !== null ? 'none' : 'max-height 0.3s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ padding: '8px 0', cursor: 'grab', touchAction: 'none' }}
        >
          <div className="sheet-handle" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar safe-bottom" style={{ paddingBottom: 24 }}>
          <div className="max-w-md mx-auto px-6 space-y-3">

            {/* View toggle: Today / Week */}
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)' }}>
              <button onClick={() => setShowWeekly(false)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: !showWeekly ? '#f97316' : 'transparent', color: !showWeekly ? 'white' : 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer' }}>Today</button>
              <button onClick={() => setShowWeekly(true)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: showWeekly ? '#f97316' : 'transparent', color: showWeekly ? 'white' : 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer' }}>This Week</button>
            </div>

            {/* Weekly view */}
            {showWeekly && weekData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weekData.map((day) => {
                  const hasJobs = day.bookings.length > 0;
                  const hasAssignment = !!day.assignment;
                  return (
                    <div key={day.date} className="dark-card" style={{ padding: 12, opacity: day.date < new Date().toISOString().slice(0, 10) && !hasJobs ? 0.5 : 1, borderLeft: day.isToday ? '3px solid #f97316' : '1px solid rgba(0,0,0,.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasJobs ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: day.isToday ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(0,0,0,.5)', textTransform: 'uppercase' }}>{day.dayName}</span>
                            <span className="tabular" style={{ fontSize: 14, fontWeight: 700, color: day.isToday ? '#f97316' : '#1a1a1a' }}>{day.dayNum}</span>
                          </div>
                          <div>
                            {hasAssignment && <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{day.assignment.uhaul_location || 'Assigned'}</div>}
                            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.5)' }}>{hasJobs ? `${day.bookings.length} job${day.bookings.length > 1 ? 's' : ''}` : hasAssignment ? 'No jobs' : 'Off'}</div>
                          </div>
                        </div>
                        {hasJobs && (
                          <span className="tabular" style={{ fontSize: 14, fontWeight: 600, color: '#f97316' }}>${day.bookings.reduce((s, b) => s + Number(b.total_price || 0), 0).toFixed(0)}</span>
                        )}
                      </div>
                      {hasJobs && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {day.bookings.map((b) => (
                            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: 'rgba(0,0,0,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{b.time_slot || ''} {b.name}</span>
                              <span style={{ color: b.status === 'completed' ? '#22C55E' : 'rgba(0,0,0,.4)', fontSize: 11, marginLeft: 8, flexShrink: 0 }}>{b.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="slide-up" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 14, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* No assignment */}
            {!assignment && !showWeekly && (
              <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                <Calendar size={64} color="rgba(0,0,0,.4)" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>No assignment scheduled for today</div>
                <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)' }}>Your shift starts automatically when you begin a job.</div>
              </div>
            )}

            {/* Assignment + Partner card */}
            {assignment && !showWeekly && (
              <div className="dark-card p-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Today&apos;s Pickup</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginTop: 2 }}>{assignment.uhaul_location || assignment.pickup_location || '—'}</div>
                  </div>
                </div>
                {partner && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Partner</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                        {partner.name || `${partner.first_name || ''} ${partner.last_name || ''}`.trim()}
                      </div>
                    </div>
                    {partner.phone && (
                      <a href={`tel:${partner.phone}`} className="glass-btn" style={{ minHeight: 40, padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#1a1a1a', textDecoration: 'none' }}>
                        <Phone size={16} color="#f97316" /> Call
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Truck check section */}
            {assignment && !showWeekly && (
              <div className="dark-card p-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Truck size={18} color="rgba(0,0,0,.6)" />
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Truck Check</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=pickup`)}
                    disabled={bookings.length === 0}
                    className="btn-primary"
                    style={{ minHeight: 48, fontSize: 14 }}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => router.push(`/portal/job?booking_id=${bookings[0]?.id || ''}&check=return`)}
                    disabled={bookings.length === 0}
                    className="btn-ghost"
                    style={{ minHeight: 48, fontSize: 14 }}
                  >
                    Return
                  </button>
                </div>
              </div>
            )}

            {/* Job cards */}
            {assignment && bookings.length > 0 && !showWeekly && (
              <div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>
                  Jobs ({bookings.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    const sc = STATUS_COLORS[b.status] || STATUS_COLORS.scheduled;
                    const itemsExpanded = expandedItems[b.id];
                    const notesExpanded = expandedNotes[b.id];
                    return (
                      <div
                        key={b.id}
                        className="dark-card p-4"
                        style={{
                          borderLeft: isNext && !completed ? '3px solid #f97316' : '1px solid rgba(0,0,0,.06)',
                        }}
                      >
                        {/* Top row: number badge + customer + status pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f97316', flexShrink: 0 }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                            {b.status}
                          </span>
                        </div>

                        {/* Second row: address + price */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {b.address || '—'}
                          </div>
                          <div className="tabular" style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', flexShrink: 0 }}>
                            ${Number(b.total_price || 0).toFixed(2)}
                          </div>
                        </div>

                        {/* Time slot */}
                        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>
                          {b.time_slot || 'Time TBD'} · {b.load_size || '—'}
                        </div>

                        {/* Items collapsible */}
                        {items.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <button
                              onClick={() => setExpandedItems((p) => ({ ...p, [b.id]: !p[b.id] }))}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.6)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0 }}
                            >
                              {items.length} items <ChevronDown size={14} style={{ transform: itemsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            {itemsExpanded && (
                              <ul style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 8, paddingLeft: 16, listStyle: 'disc' }}>
                                {items.map((it, i) => (
                                  <li key={i} style={{ marginBottom: 2 }}>
                                    {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}x ${it.name || it.item || it.description || ''}`}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Notes as sticky-note tag */}
                        {b.notes && (
                          <div style={{ marginBottom: 8 }}>
                            <button
                              onClick={() => setExpandedNotes((p) => ({ ...p, [b.id]: !p[b.id] }))}
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#F59E0B', cursor: 'pointer' }}
                            >
                              <StickyNote size={14} /> Notes
                              <ChevronDown size={14} style={{ transform: notesExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            {notesExpanded && (
                              <div style={{ marginTop: 8, padding: 12, background: 'rgba(245,158,11,0.05)', borderRadius: 8, fontSize: 13, color: 'rgba(0,0,0,.6)' }}>
                                {b.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Live timer */}
                        {inProgress && open && (
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B', letterSpacing: 1 }}>
                              {fmtDuration(now - new Date(open.clock_in_at).getTime())}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>job in progress</div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!completed && !inProgress && (
                            <button
                              onClick={() => jobClock(b.id, 'in')}
                              disabled={busy === b.id}
                              className="btn-primary"
                              style={{ flex: 1, minHeight: 48, fontSize: 15 }}
                            >
                              {busy === b.id ? '...' : 'Start Job'}
                            </button>
                          )}
                          {inProgress && (
                            <button
                              onClick={() => jobClock(b.id, 'out')}
                              disabled={busy === b.id}
                              className="btn-primary"
                              style={{ flex: 1, minHeight: 48, fontSize: 15, background: '#F5F5F7', color: '#1a1a1a' }}
                            >
                              {busy === b.id ? '...' : 'End Job'}
                            </button>
                          )}
                          {completed && (
                            <button
                              onClick={() => router.push(`/portal/job?booking_id=${b.id}`)}
                              className="btn-ghost"
                              style={{ flex: 1, minHeight: 48, fontSize: 15 }}
                            >
                              View Details
                            </button>
                          )}
                          {b.address && !completed && (
                            <button
                              onClick={() => navigateToJob(b)}
                              className="btn-ghost"
                              style={{ minHeight: 48, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <Navigation size={16} /> Go
                            </button>
                          )}
                          {!completed && (
                            <button
                              onClick={() => router.push(`/portal/job?booking_id=${b.id}`)}
                              className="btn-ghost"
                              style={{ minHeight: 48, fontSize: 14 }}
                            >
                              Flow
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* End of day summary */}
            {allDone && !showWeekly && (
              <div className="dark-card slide-up p-6" style={{ textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={48} color="#22C55E" className="celebrate" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Great work today!</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <div className="tabular" style={{ fontSize: 34, fontWeight: 700, color: '#1a1a1a' }}>{jobsCompleted}</div>
                    <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>jobs done</div>
                  </div>
                  <div>
                    <div className="tabular" style={{ fontSize: 34, fontWeight: 700, color: '#1a1a1a' }}>{totalHours}</div>
                    <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>hours</div>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings estimator */}
            {assignment && !showWeekly && (
              <div className="dark-card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Estimated Earnings</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                  <div>
                    <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>${(totalMinutes / 60 * (emp?.pay_rate || 18)).toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', marginTop: 2 }}>Today</div>
                  </div>
                  <div>
                    <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{totalHours}h</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', marginTop: 2 }}>Worked</div>
                  </div>
                  <div>
                    <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>${emp?.pay_rate || 18}/hr</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', marginTop: 2 }}>Rate</div>
                  </div>
                </div>
                {clockedIn && data?.open_shift?.clock_in_at && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Current shift</span>
                    <span className="tabular" style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>{fmtDuration(now - new Date(data.open_shift.clock_in_at).getTime())}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
