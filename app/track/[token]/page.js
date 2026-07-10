'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// ============================================================
// /track/[token] — the customer's window into their entire
// junk removal experience. Mobile-first, Uber-like, orange theme.
//
// Sections shown progressively based on job status:
//  Header · Job Summary · Crew · Live Map · Pay Balance ·
//  Track Your Junk · Feedback & Tip · Contact Support
//
// Auto-refreshes every 15 seconds. Public — token IS the auth.
// ============================================================

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const STATUS_FLOW = ['scheduled', 'en_route', 'arrived', 'in_progress', 'complete', 'awaiting_payment'];
const STATUS_LABEL = {
  scheduled: 'Scheduled',
  en_route: 'En Route',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  complete: 'Completed',
  awaiting_payment: 'Awaiting Payment',
  confirmed: 'Scheduled',
};
const LOAD_LABELS = {
  single_item: '1-2 items',
  quarter: 'Small load',
  half: 'Half load',
  full: 'Full load',
};

export default function TrackPage({ params }) {
  const { token } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [balancePaid, setBalancePaid] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [tipDone, setTipDone] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${token}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const d = await res.json();
      setData(d);
      setBalancePaid(d.booking?.payment_status === 'paid' || d.booking?.balance_due <= 0);
      setFeedbackDone(d.feedback_submitted);
      setTipDone(d.tip_submitted);
      setLoading(false);
    } catch {
      // network blip — keep last data
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/crew-logo.png" alt="Junk Haul" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg animate-pulse" />
          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <div className="text-gray-400 text-sm mt-3">Loading your tracking link…</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-dvh bg-orange-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tracking link not found</h1>
          <p className="text-gray-500 text-sm">
            This link may have expired or is incorrect. Check your SMS for the correct link, or contact us.
          </p>
          <a href="tel:+15873250751" className="mt-5 inline-block bg-orange-500 text-white font-semibold px-6 py-3 rounded-xl">
            Call (587) 325-0751
          </a>
        </div>
      </div>
    );
  }

  const b = data.booking;
  const crew = data.crew || [];
  const crewLoc = data.crew_location;
  const status = b.crew_status || b.status || 'scheduled';
  const isCompleted = status === 'complete' || b.status === 'completed';
  const showMap = status === 'en_route' || status === 'arrived';
  const balanceDue = Number(b.balance_due || 0);
  const showPay = balanceDue > 0 && !balancePaid && (status === 'arrived' || status === 'in_progress' || status === 'awaiting_payment' || status === 'complete' || b.status === 'completed');

  return (
    <div className="min-h-dvh bg-orange-50">
      <div className="max-w-md mx-auto pb-10">
        <Header status={status} />
        <JobSummary booking={b} />
        {crew.length > 0 && <CrewCard crew={crew} status={status} />}
        {showMap && <LiveMap crewLoc={crewLoc} booking={b} />}
        {showPay && (
          <PayBalance
            booking={b}
            balanceDue={balanceDue}
            onPaid={() => setBalancePaid(true)}
          />
        )}
        {isCompleted && <TrackYourJunk data={data} />}
        {isCompleted && (
          <FeedbackTip
            token={token}
            feedbackDone={feedbackDone}
            tipDone={tipDone}
            onFeedbackDone={() => setFeedbackDone(true)}
            onTipDone={() => setTipDone(true)}
          />
        )}
        <ContactSupport />
        <Footer />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Header — logo + status badge
// ────────────────────────────────────────────────────────────
function Header({ status }) {
  const label = STATUS_LABEL[status] || 'Scheduled';
  const badgeStyle = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-blue-100 text-blue-700',
    en_route: 'bg-orange-100 text-orange-700',
    arrived: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
    awaiting_payment: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/crew-logo.png" alt="Junk Haul" className="w-10 h-10 rounded-xl shadow-sm" />
          <div>
            <div className="font-extrabold text-gray-900 text-base leading-tight tracking-tight">Junk Haul</div>
            <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Calgary</div>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${badgeStyle[status] || 'bg-gray-100 text-gray-600'}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Job Summary Card
// ────────────────────────────────────────────────────────────
function JobSummary({ booking }) {
  const items = Array.isArray(booking.itemized_items)
    ? booking.itemized_items
    : (typeof booking.itemized_items === 'string'
        ? (() => { try { return JSON.parse(booking.itemized_items); } catch { return []; } })()
        : []);

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Your Booking</div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-gray-900">{LOAD_LABELS[booking.load_size] || booking.load_size}</div>
            {booking.booking_ref && <div className="text-xs text-gray-400">Ref {booking.booking_ref}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-orange-500">${Number(booking.total_price || 0).toFixed(0)}</div>
            <div className="text-[10px] text-gray-400">total</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0.5">📍</span>
            <span className="text-gray-700">{booking.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0.5">📅</span>
            <span className="text-gray-700">{formatDate(booking.job_date)} · {formatTime(booking.job_time)}</span>
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1.5">Items</div>
            <ul className="text-sm text-gray-700 space-y-0.5">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-orange-400">•</span>
                  {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}× ${it.name || it.item || it.description || ''}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {booking.description_text && (
          <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
            {booking.description_text}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-400">Deposit</div>
            <div className="font-bold text-gray-900 text-sm">${Number(booking.deposit_amount || 0).toFixed(0)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Paid</div>
            <div className="font-bold text-green-600 text-sm">${Number(booking.deposit_amount || 0).toFixed(0)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Balance</div>
            <div className="font-bold text-orange-500 text-sm">${Number(booking.balance_due || 0).toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Crew Card — selfies + status message
// ────────────────────────────────────────────────────────────
function CrewCard({ crew, status }) {
  const names = crew.map((c) => c.first_name).filter(Boolean);
  const nameText = names.length === 0
    ? 'Your crew'
    : names.length === 1
      ? `${names[0]} is your crew today`
      : `${names.slice(0, -1).join(' & ')} & ${names[names.length - 1]} are your crew today`;

  const msg = {
    scheduled: 'Your crew will be assigned soon',
    confirmed: 'Your crew will be assigned soon',
    en_route: 'Your crew is on the way!',
    arrived: 'Your crew has arrived',
    in_progress: 'Your crew is hard at work',
    complete: 'Your crew has finished the job',
    awaiting_payment: 'Your crew has finished the job',
  }[status] || 'Your crew is ready for you';

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {crew.map((c, i) => (
              <div key={i} className="relative">
                {c.selfie_url ? (
                  <img
                    src={c.selfie_url}
                    alt={c.first_name || 'Crew'}
                    className="w-14 h-14 rounded-full border-3 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-3 border-white bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg shadow-sm">
                    {(c.first_name || '?')[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm truncate">{nameText}</div>
            <div className="text-orange-500 font-semibold text-sm mt-0.5">{msg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Live Map — Mapbox GL JS showing crew + destination
// ────────────────────────────────────────────────────────────
function LiveMap({ crewLoc, booking }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({ crew: null, dest: null });
  const [mapReady, setMapReady] = useState(false);

  // Load Mapbox GL JS script once
  useEffect(() => {
    if (!MAPBOX_TOKEN || mapInstance.current || window.mapboxgl) {
      if (window.mapboxgl && !mapInstance.current) initMap();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.min.js';
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!window.mapboxgl || !mapRef.current || mapInstance.current) return;
    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    const dest = [booking.lng, booking.lat];
    const start = crewLoc ? [crewLoc.lng, crewLoc.lat] : dest;
    const map = new window.mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: start,
      zoom: 13,
    });
    mapInstance.current = map;
    map.on('load', () => {
      setMapReady(true);
      // Destination marker (home pin)
      const destEl = document.createElement('div');
      destEl.innerHTML = '🏠';
      destEl.style.fontSize = '32px';
      destEl.style.lineHeight = '32px';
      markersRef.current.dest = new window.mapboxgl.Marker(destEl, { anchor: 'bottom' })
        .setLngLat(dest)
        .addTo(map);

      if (crewLoc) addCrewMarker(crewLoc);

      // Fit bounds to show both markers
      if (crewLoc) {
        const bounds = new window.mapboxgl.LngLatBounds();
        bounds.extend(dest);
        bounds.extend([crewLoc.lng, crewLoc.lat]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
      }
    });
  }

  function addCrewMarker(loc) {
    const map = mapInstance.current;
    if (!map || !window.mapboxgl) return;
    if (markersRef.current.crew) markersRef.current.crew.remove();
    const el = document.createElement('div');
    el.innerHTML = '🚛';
    el.style.fontSize = '34px';
    el.style.lineHeight = '34px';
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    markersRef.current.crew = new window.mapboxgl.Marker(el, { anchor: 'bottom' })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map);
  }

  // Update crew marker when location changes
  useEffect(() => {
    if (!mapReady || !crewLoc || !mapInstance.current) return;
    addCrewMarker(crewLoc);
    // Refit bounds
    const map = mapInstance.current;
    const bounds = new window.mapboxgl.LngLatBounds();
    bounds.extend([booking.lng, booking.lat]);
    bounds.extend([crewLoc.lng, crewLoc.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewLoc, mapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="text-sm font-bold text-gray-900 mb-1">Live Crew Location</div>
          {crewLoc ? (
            <div className="text-sm text-gray-600">
              🚛 Your crew is nearby — {crewLoc.lat?.toFixed(4)}, {crewLoc.lng?.toFixed(4)}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Crew not yet en route — you&apos;ll see them on the map when they head your way.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide px-5 pt-4 pb-2">Live Crew Location</div>
        {crewLoc ? (
          <div ref={mapRef} className="w-full h-72 bg-gray-100" />
        ) : (
          <div className="h-48 flex flex-col items-center justify-center bg-gray-50 m-3 rounded-xl">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-sm text-gray-500 text-center px-6">
              Crew not yet en route — you&apos;ll see them on the map when they head your way.
            </div>
          </div>
        )}
        {crewLoc && (
          <div className="px-5 py-3 text-sm text-gray-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {crewLoc.en_route ? 'Crew is moving — updating live' : 'Last seen here'}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Pay Balance — inline Stripe Elements payment
// ────────────────────────────────────────────────────────────
function PayBalance({ booking, balanceDue, onPaid }) {
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const startPayment = async () => {
    setShowForm(true);
    setLoading(true);
    setErr(null);
    try {
      // Reuse the existing balance-payment endpoint by booking id
      const res = await fetch(`/api/crew/balance-payment/${booking.id}`);
      const d = await res.json();
      if (d.paid) {
        onPaid();
        return;
      }
      setClientSecret(d.clientSecret);
    } catch {
      setErr('Could not start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="px-4 mt-4">
        <button
          onClick={startPayment}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform text-base"
        >
          Pay remaining balance ${balanceDue.toFixed(0)}
        </button>
      </div>
    );
  }

  if (!clientSecret && !loading) {
    return (
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p className="text-red-500 text-sm mb-3">{err || 'Could not load payment form.'}</p>
          <button onClick={startPayment} className="text-orange-500 font-semibold text-sm">Try again</button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <div className="text-gray-400 text-sm mt-2">Loading payment…</div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p className="text-gray-600 text-sm">Online payment unavailable. Please pay cash or call (587) 325-0751.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="font-bold text-gray-900 mb-1">Pay Balance</div>
        <div className="text-2xl font-extrabold text-orange-500 mb-4">${balanceDue.toFixed(2)}</div>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#f97316' } } }}>
          <BalanceForm bookingId={booking.id} email={booking.email} onPaid={onPaid} />
        </Elements>
      </div>
    </div>
  );
}

function BalanceForm({ bookingId, email, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: email || undefined,
        return_url: window.location.origin + window.location.pathname,
      },
    });
    if (result.error) {
      setErr(result.error.message);
      setBusy(false);
    } else {
      setDone(true);
      onPaid();
    }
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-2">✅</div>
        <div className="font-bold text-gray-900 text-lg">Payment received — thank you!</div>
      </div>
    );
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <button type="submit" disabled={busy} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl mt-4 disabled:bg-orange-300 active:scale-[0.98] transition-transform">
        {busy ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────
// Track Your Junk — photos + timeline of where items went
// ────────────────────────────────────────────────────────────
function TrackYourJunk({ data }) {
  const drops = data.storage_drops || [];
  const donationRuns = data.donation_runs || [];

  // Collect all photos from storage drops
  const dropPhotos = drops.flatMap((d) => {
    const photos = Array.isArray(d.item_photos) ? d.item_photos : [];
    return photos.map((p) => (typeof p === 'string' ? p : p.url || p.photo || null)).filter(Boolean);
  });

  const hasStorage = drops.length > 0;
  const hasDonation = donationRuns.length > 0 && donationRuns.some((d) => d.status === 'completed');

  // Build timeline
  const timeline = [{ icon: '📦', label: 'Picked up from your location', done: true }];
  if (hasStorage) {
    const fac = drops[0]?.facility;
    timeline.push({
      icon: '🏪',
      label: `Dropped at storage facility${fac?.name ? ` — ${fac.name}` : ''}`,
      done: true,
    });
  }
  if (hasDonation) {
    const center = donationRuns.find((d) => d.status === 'completed')?.center;
    timeline.push({
      icon: '❤️',
      label: `Donated to charity${center?.name ? ` — ${center.name}` : ''}`,
      done: true,
    });
  }
  if (!hasStorage && !hasDonation) {
    timeline.push({ icon: '♻️', label: 'Disposed at landfill', done: true });
  }

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Track Your Junk</div>

        {/* Green checkmark banner */}
        <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl flex-shrink-0">✓</div>
          <div className="text-sm font-semibold text-green-800">Your items were responsibly disposed of</div>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {timeline.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-lg flex-shrink-0">
                  {step.icon}
                </div>
                {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-orange-200 my-1 min-h-[24px]" />}
              </div>
              <div className="pt-1.5 pb-6">
                <div className="text-sm font-semibold text-gray-900">{step.label}</div>
                {step.done && <div className="text-xs text-green-600 mt-0.5">✓ Complete</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Storage photos */}
        {dropPhotos.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-2">Photos at storage facility</div>
            <div className="grid grid-cols-3 gap-2">
              {dropPhotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Item ${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Feedback & Tip
// ────────────────────────────────────────────────────────────
function FeedbackTip({ token, feedbackDone, tipDone, onFeedbackDone, onTipDone }) {
  return (
    <div className="px-4 mt-4 space-y-4">
      <FeedbackSection token={token} done={feedbackDone} onDone={onFeedbackDone} />
      <TipSection token={token} done={tipDone} onDone={onTipDone} />
    </div>
  );
}

function FeedbackSection({ token, done, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (rating < 1) { setErr('Please select a star rating.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/track/${token}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review_text: review, name }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'Could not submit'); setBusy(false); return; }
      onDone();
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <div className="text-4xl mb-2">🙏</div>
        <div className="font-bold text-gray-900">Thank you for your feedback!</div>
        <div className="text-sm text-gray-500 mt-1">We appreciate you taking the time to review us.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Rate Your Experience</div>

      {/* Stars */}
      <div className="flex gap-1.5 justify-center mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-4xl transition-transform active:scale-90"
            aria-label={`${n} stars`}
          >
            <span className={(hover || rating) >= n ? 'text-orange-400' : 'text-gray-200'}>★</span>
          </button>
        ))}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Tell us how we did (optional)…"
        rows={3}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
      />

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl mt-3 disabled:bg-orange-300 active:scale-[0.98] transition-transform"
      >
        {busy ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

function TipSection({ token, done, onDone }) {
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const presets = [5, 10, 20];

  const startTip = async (amt) => {
    setShowForm(true);
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/track/${token}/tip?amount=${amt}`);
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'Could not start tip'); setLoading(false); return; }
      setClientSecret(d.client_secret);
    } catch {
      setErr('Network error');
      setLoading(false);
    }
  };

  const finalAmount = custom ? parseFloat(custom) : amount;

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <div className="text-4xl mb-2">💚</div>
        <div className="font-bold text-gray-900">Tip received — thank you!</div>
        <div className="text-sm text-gray-500 mt-1">100% goes to your crew.</div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Tip Your Crew</div>
        <div className="text-sm text-gray-500 mb-4">100% of your tip goes to the crew</div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p); setCustom(''); }}
              className={`py-3 rounded-xl font-bold text-sm transition-transform active:scale-95 ${
                amount === p && !custom ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-400 text-sm">$</span>
          <input
            type="number"
            min="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom amount"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <button
          onClick={() => startTip(finalAmount)}
          disabled={!finalAmount || finalAmount < 1}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          Tip ${finalAmount || 0}
        </button>
      </div>
    );
  }

  if (!clientSecret && loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
        <div className="text-gray-400 text-sm mt-2">Loading tip payment…</div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <p className="text-red-500 text-sm mb-3">{err || 'Could not load tip form.'}</p>
        <button onClick={() => { setShowForm(false); }} className="text-orange-500 font-semibold text-sm">Back</button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <p className="text-gray-600 text-sm">Online tipping unavailable. Please call (587) 325-0751.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="font-bold text-gray-900 mb-1">Tip Your Crew</div>
      <div className="text-2xl font-extrabold text-orange-500 mb-4">${finalAmount.toFixed(2)}</div>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#f97316' } } }}>
        <TipForm amount={finalAmount} onDone={onDone} />
      </Elements>
    </div>
  );
}

function TipForm({ amount, onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
    });
    if (result.error) {
      setErr(result.error.message);
      setBusy(false);
    } else {
      setDone(true);
      onDone();
    }
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-2">💚</div>
        <div className="font-bold text-gray-900 text-lg">Tip received — thank you!</div>
        <div className="text-sm text-gray-500 mt-1">100% goes to your crew.</div>
      </div>
    );
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <button type="submit" disabled={busy} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50 active:scale-[0.98] transition-transform">
        {busy ? 'Processing…' : `Tip $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────
// Contact Support
// ────────────────────────────────────────────────────────────
function ContactSupport() {
  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Need Help?</div>
        <div className="grid grid-cols-3 gap-2">
          <a href="tel:+15873250751" className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-50 active:scale-95 transition-transform">
            <span className="text-2xl">📞</span>
            <span className="text-xs font-semibold text-gray-700">Call</span>
          </a>
          <a href="sms:+15873250751" className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-50 active:scale-95 transition-transform">
            <span className="text-2xl">💬</span>
            <span className="text-xs font-semibold text-gray-700">Text</span>
          </a>
          <a href="mailto:support@junkhaul.ca" className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-50 active:scale-95 transition-transform">
            <span className="text-2xl">✉️</span>
            <span className="text-xs font-semibold text-gray-700">Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center px-4 mt-6">
      <div className="text-xs text-gray-400">junkhaul.ca · (587) 325-0751</div>
      <div className="text-xs text-gray-300 mt-1">Calgary&apos;s trusted junk removal team</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
}
