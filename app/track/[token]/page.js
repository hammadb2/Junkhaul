'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Star, Phone, MessageSquare, Mail, MapPin, CheckCircle, Circle, Truck, Home, ChevronRight } from 'lucide-react';

// ============================================================
// /track/[token] — customer tracking portal (dark theme).
// Auto-refreshes every 15 seconds. Public — token IS the auth.
// ============================================================

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const STATUS_STEPS = ['scheduled', 'en_route', 'arrived', 'in_progress', 'complete'];
const STATUS_LABEL = {
  scheduled: 'Scheduled', en_route: 'En Route', arrived: 'Arrived',
  in_progress: 'In Progress', complete: 'Completed',
  awaiting_payment: 'Completed', confirmed: 'Scheduled',
};
const LOAD_LABELS = { single_item: '1-2 items', quarter: 'Small load', half: 'Half load', full: 'Full load' };

const D = '#0A0A0B';
const CARD = '#161618';
const INPUT = '#1A1A1E';
const ORANGE = '#f97316';
const TXT = 'rgba(255,255,255,0.9)';
const TXT2 = 'rgba(255,255,255,0.6)';
const TXT3 = 'rgba(255,255,255,0.4)';

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
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const d = await res.json();
      setData(d);
      setBalancePaid(d.booking?.payment_status === 'paid' || d.booking?.balance_due <= 0);
      setFeedbackDone(d.feedback_submitted);
      setTipDone(d.tip_submitted);
      setLoading(false);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: D, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/crew-logo.png" alt="Junk Haul" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px' }} />
          <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <div style={{ color: TXT3, fontSize: 14, marginTop: 12 }}>Loading your tracking link...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100dvh', background: D, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="dark-card" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TXT, marginBottom: 8 }}>Tracking link not found</h1>
          <p style={{ color: TXT2, fontSize: 14, marginBottom: 20 }}>This link may have expired or is incorrect. Check your SMS for the correct link.</p>
          <a href="tel:+15873250751" className="btn-primary" style={{ display: 'inline-block', minHeight: 48, padding: '12px 24px', textDecoration: 'none' }}>Call (587) 325-0751</a>
        </div>
      </div>
    );
  }

  const b = data.booking;
  const crew = data.crew || [];
  const crewLoc = data.crew_location;
  const status = b.crew_status || b.status || 'scheduled';
  const isCompleted = status === 'complete' || status === 'awaiting_payment' || b.status === 'completed';
  const showMap = status === 'en_route' || status === 'arrived';
  const balanceDue = Number(b.balance_due || 0);
  const showPay = balanceDue > 0 && !balancePaid && (status === 'arrived' || status === 'in_progress' || status === 'awaiting_payment' || status === 'complete' || b.status === 'completed');

  return (
    <div style={{ minHeight: '100dvh', background: D }}>
      <div style={{ maxWidth: 448, margin: '0 auto', paddingBottom: 40 }}>
        <Header status={status} />
        <JobSummary booking={b} />
        {crew.length > 0 && <CrewCard crew={crew} status={status} />}
        {showMap && <LiveMap crewLoc={crewLoc} booking={b} />}
        {showPay && <PayBalance booking={b} balanceDue={balanceDue} onPaid={() => setBalancePaid(true)} />}
        {isCompleted && <TrackYourJunk data={data} />}
        {isCompleted && <FeedbackTip token={token} feedbackDone={feedbackDone} tipDone={tipDone} onFeedbackDone={() => setFeedbackDone(true)} onTipDone={() => setTipDone(true)} />}
        <ContactSupport />
        <Footer />
      </div>
    </div>
  );
}

// ── Header with step tracker ──
function Header({ status }) {
  const normalized = status === 'awaiting_payment' || status === 'confirmed' ? (status === 'confirmed' ? 'scheduled' : 'complete') : status;
  const currentIdx = STATUS_STEPS.indexOf(normalized);

  return (
    <div className="glass-bar safe-top" style={{ padding: '16px 24px', position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/crew-logo.png" alt="Junk Haul" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div>
            <div style={{ fontWeight: 700, color: TXT, fontSize: 16, lineHeight: 1.2 }}>Junk Haul</div>
            <div style={{ fontSize: 10, color: TXT3, textTransform: 'uppercase', letterSpacing: 1 }}>Calgary</div>
          </div>
        </div>
      </div>
      {/* Step tracker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {STATUS_STEPS.map((s, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx;
          const color = done ? '#22C55E' : current ? ORANGE : 'rgba(255,255,255,0.2)';
          return (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < STATUS_STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 12, left: '50%', width: '100%', height: 2, background: done ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
              )}
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: current ? `2px solid ${ORANGE}` : 'none' }}>
                {done && <CheckCircle size={14} color="white" />}
                {current && <Circle size={8} color="white" fill="white" />}
              </div>
              <div style={{ fontSize: 10, color: current ? ORANGE : done ? '#22C55E' : TXT3, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {STATUS_LABEL[s]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Job Summary ──
function JobSummary({ booking }) {
  const items = Array.isArray(booking.itemized_items)
    ? booking.itemized_items
    : (typeof booking.itemized_items === 'string' ? (() => { try { return JSON.parse(booking.itemized_items); } catch { return []; } })() : []);

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Your Booking</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>{LOAD_LABELS[booking.load_size] || booking.load_size}</div>
            {booking.booking_ref && <div style={{ fontSize: 12, color: TXT3 }}>Ref {booking.booking_ref}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tabular" style={{ fontSize: 28, fontWeight: 800, color: ORANGE }}>${Number(booking.total_price || 0).toFixed(0)}</div>
            <div style={{ fontSize: 10, color: TXT3 }}>total</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <MapPin size={16} color={TXT3} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: TXT2 }}>{booking.address}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: TXT3, fontSize: 14 }}>📅</span>
            <span style={{ color: TXT2 }}>{formatDate(booking.job_date)} · {formatTime(booking.job_time)}</span>
          </div>
        </div>
        {items.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, color: TXT3, marginBottom: 6 }}>Items</div>
            {items.map((it, i) => (
              <div key={i} style={{ fontSize: 14, color: TXT2, padding: '2px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: ORANGE }}>•</span>
                {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}x ${it.name || it.item || it.description || ''}`}
              </div>
            ))}
          </div>
        )}
        {Number(booking.travel_fee || 0) > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: TXT2 }}>Travel Charge</span>
              <span className="tabular" style={{ color: TXT, fontWeight: 600 }}>${Number(booking.travel_fee).toFixed(0)}</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: TXT3 }}>Deposit</div>
            <div className="tabular" style={{ fontWeight: 700, color: TXT, fontSize: 14 }}>${Number(booking.deposit_amount || 0).toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: TXT3 }}>Paid</div>
            <div className="tabular" style={{ fontWeight: 700, color: '#22C55E', fontSize: 14 }}>${Number(booking.deposit_amount || 0).toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: TXT3 }}>Balance</div>
            <div className="tabular" style={{ fontWeight: 700, color: ORANGE, fontSize: 14 }}>${Number(booking.balance_due || 0).toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Crew Card ──
function CrewCard({ crew, status }) {
  const names = crew.map((c) => c.first_name).filter(Boolean);
  const nameText = names.length === 0 ? 'Your crew' : names.length === 1 ? `${names[0]} is your crew today` : `${names.slice(0, -1).join(' & ')} & ${names[names.length - 1]} are your crew today`;
  const msg = {
    scheduled: 'Your crew will be assigned soon', confirmed: 'Your crew will be assigned soon',
    en_route: 'Your crew is on the way!', arrived: 'Your crew has arrived',
    in_progress: 'Your crew is hard at work', complete: 'Your crew has finished the job',
    awaiting_payment: 'Your crew has finished the job',
  }[status] || 'Your crew is ready for you';

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {crew.map((c, i) => (
              <div key={i} style={{ marginLeft: i > 0 ? -12 : 0, position: 'relative' }}>
                {c.selfie_url ? (
                  <img src={c.selfie_url} alt={c.first_name || 'Crew'} style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #161618', objectFit: 'cover', boxShadow: '0 0 12px rgba(249,115,22,0.3)' }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #161618', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ORANGE, fontWeight: 700, fontSize: 18 }}>
                    {(c.first_name || '?')[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: TXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameText}</div>
            <div style={{ fontSize: 14, color: ORANGE, fontWeight: 600, marginTop: 2 }}>{msg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Live Map ──
function LiveMap({ crewLoc, booking }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({ crew: null, dest: null });
  const [mapReady, setMapReady] = useState(false);

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
    const map = new window.mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11', center: start, zoom: 13 });
    mapInstance.current = map;
    map.on('load', () => {
      setMapReady(true);
      const destEl = document.createElement('div');
      destEl.innerHTML = '🏠';
      destEl.style.fontSize = '32px';
      destEl.style.lineHeight = '32px';
      markersRef.current.dest = new window.mapboxgl.Marker(destEl, { anchor: 'bottom' }).setLngLat(dest).addTo(map);
      if (crewLoc) addCrewMarker(crewLoc);
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
    markersRef.current.crew = new window.mapboxgl.Marker(el, { anchor: 'bottom' }).setLngLat([loc.lng, loc.lat]).addTo(map);
  }

  useEffect(() => {
    if (!mapReady || !crewLoc || !mapInstance.current) return;
    addCrewMarker(crewLoc);
    const map = mapInstance.current;
    const bounds = new window.mapboxgl.LngLatBounds();
    bounds.extend([booking.lng, booking.lat]);
    bounds.extend([crewLoc.lng, crewLoc.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewLoc, mapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="dark-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: TXT, marginBottom: 4 }}>Live Crew Location</div>
          {crewLoc ? <div style={{ fontSize: 14, color: TXT2 }}>🚛 Your crew is nearby</div> : <div style={{ fontSize: 14, color: TXT3 }}>Crew not yet en route.</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, padding: '16px 20px 8px' }}>Live Crew Location</div>
        {crewLoc ? (
          <div ref={mapRef} style={{ width: '100%', height: 288, background: D }} />
        ) : (
          <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 12, borderRadius: 12, background: INPUT }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
            <div style={{ fontSize: 14, color: TXT3, textAlign: 'center', padding: '0 24px' }}>Crew not yet en route — you&apos;ll see them on the map when they head your way.</div>
          </div>
        )}
        {crewLoc && (
          <div style={{ padding: '12px 20px', fontSize: 14, color: TXT2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
            {crewLoc.en_route ? 'Crew is moving — updating live' : 'Last seen here'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pay Balance ──
function PayBalance({ booking, balanceDue, onPaid }) {
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const startPayment = async () => {
    setShowForm(true); setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/crew/balance-payment/${booking.id}`);
      const d = await res.json();
      if (d.paid) { onPaid(); return; }
      setClientSecret(d.clientSecret);
    } catch { setErr('Could not start payment.'); }
    finally { setLoading(false); }
  };

  if (!showForm) {
    return (
      <div style={{ padding: '16px 24px 0' }}>
        <button onClick={startPayment} className="btn-primary" style={{ width: '100%', minHeight: 56, fontSize: 18, fontWeight: 700 }}>
          Pay ${balanceDue.toFixed(0)} Balance
        </button>
      </div>
    );
  }

  if (!clientSecret && !loading) {
    return (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{err || 'Could not load payment form.'}</p>
          <button onClick={startPayment} style={{ color: ORANGE, fontWeight: 600, fontSize: 14, background: 'transparent', border: 'none', cursor: 'pointer' }}>Try again</button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <div style={{ color: TXT3, fontSize: 14, marginTop: 8 }}>Loading payment...</div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: TXT2, fontSize: 14 }}>Online payment unavailable. Please pay cash or call (587) 325-0751.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, color: TXT, marginBottom: 4 }}>Pay Balance</div>
        <div className="tabular" style={{ fontSize: 28, fontWeight: 800, color: ORANGE, marginBottom: 16 }}>${balanceDue.toFixed(2)}</div>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: ORANGE } } }}>
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
    setBusy(true); setErr(null);
    const result = await stripe.confirmPayment({ elements, confirmParams: { receipt_email: email || undefined, return_url: window.location.origin + window.location.pathname } });
    if (result.error) { setErr(result.error.message); setBusy(false); }
    else { setDone(true); onPaid(); }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <CheckCircle size={48} color="#22C55E" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 600, color: TXT, fontSize: 18 }}>Payment received — thank you!</div>
      </div>
    );
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      {err && <p style={{ color: '#EF4444', fontSize: 14, marginTop: 8 }}>{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary" style={{ width: '100%', minHeight: 48, marginTop: 16 }}>
        {busy ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// ── Track Your Junk ──
function TrackYourJunk({ data }) {
  const drops = data.storage_drops || [];
  const donationRuns = data.donation_runs || [];
  const dropPhotos = drops.flatMap((d) => {
    const photos = Array.isArray(d.item_photos) ? d.item_photos : [];
    return photos.map((p) => (typeof p === 'string' ? p : p.url || p.photo || null)).filter(Boolean);
  });
  const hasStorage = drops.length > 0;
  const hasDonation = donationRuns.length > 0 && donationRuns.some((d) => d.status === 'completed');

  const timeline = [{ icon: '📦', label: 'Picked up from your location', done: true }];
  if (hasStorage) { const fac = drops[0]?.facility; timeline.push({ icon: '🏪', label: `Dropped at storage${fac?.name ? ` — ${fac.name}` : ''}`, done: true }); }
  if (hasDonation) { const center = donationRuns.find((d) => d.status === 'completed')?.center; timeline.push({ icon: '❤️', label: `Donated to charity${center?.name ? ` — ${center.name}` : ''}`, done: true }); }
  if (!hasStorage && !hasDonation) timeline.push({ icon: '♻️', label: 'Disposed at landfill', done: true });

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Track Your Junk</div>
        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={20} color="white" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>Your items were responsibly disposed of</div>
        </div>
        {/* Timeline */}
        <div>
          {timeline.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{step.icon}</div>
                {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(249,115,22,0.2)', margin: '4px 0', minHeight: 24 }} />}
              </div>
              <div style={{ paddingTop: 6, paddingBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT }}>{step.label}</div>
                {step.done && <div style={{ fontSize: 12, color: '#22C55E', marginTop: 2 }}>✓ Complete</div>}
              </div>
            </div>
          ))}
        </div>
        {/* Photos */}
        {dropPhotos.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: TXT3, marginBottom: 8 }}>Photos at storage facility</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {dropPhotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Item ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feedback & Tip ──
function FeedbackTip({ token, feedbackDone, tipDone, onFeedbackDone, onTipDone }) {
  return (
    <div style={{ padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/track/${token}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, review_text: review, name }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'Could not submit'); setBusy(false); return; }
      onDone();
    } catch { setErr('Network error.'); setBusy(false); }
  };

  if (done) {
    return (
      <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
        <div style={{ fontWeight: 600, color: TXT }}>Thank you for your feedback!</div>
        <div style={{ fontSize: 14, color: TXT2, marginTop: 4 }}>We appreciate you taking the time to review us.</div>
      </div>
    );
  }

  return (
    <div className="dark-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Rate Your Experience</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} aria-label={`${n} stars`}>
            <Star size={32} fill={(hover || rating) >= n ? ORANGE : 'none'} color={(hover || rating) >= n ? ORANGE : 'rgba(255,255,255,0.2)'} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Tell us how we did (optional)..." rows={3} className="dark-input" style={{ width: '100%', padding: '12px 16px', fontSize: 14, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, resize: 'none', marginBottom: 8 }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="dark-input" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 14, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
        </>
      )}
      {err && <p style={{ color: '#EF4444', fontSize: 14, marginTop: 8 }}>{err}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary" style={{ width: '100%', minHeight: 48, marginTop: 12 }}>
        {busy ? 'Submitting...' : 'Submit Review'}
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
  const finalAmount = custom ? parseFloat(custom) : amount;

  const startTip = async (amt) => {
    setShowForm(true); setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/track/${token}/tip?amount=${amt}`);
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'Could not start tip'); setLoading(false); return; }
      setClientSecret(d.client_secret);
    } catch { setErr('Network error'); setLoading(false); }
  };

  if (done) {
    return (
      <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💚</div>
        <div style={{ fontWeight: 600, color: TXT }}>Tip received — thank you!</div>
        <div style={{ fontSize: 14, color: TXT2, marginTop: 4 }}>100% goes to your crew.</div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tip Your Crew</div>
        <div style={{ fontSize: 14, color: TXT2, marginBottom: 16 }}>100% of your tip goes to the crew</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {presets.map((p) => (
            <button key={p} onClick={() => { setAmount(p); setCustom(''); }} className="dark-card" style={{ minHeight: 48, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: amount === p && !custom ? `2px solid ${ORANGE}` : '1px solid rgba(255,255,255,0.06)', background: amount === p && !custom ? 'rgba(249,115,22,0.1)' : CARD, color: amount === p && !custom ? ORANGE : TXT, borderRadius: 12 }}>
              ${p}
            </button>
          ))}
          <button onClick={() => setAmount(0)} className="dark-card" style={{ minHeight: 48, fontWeight: 600, fontSize: 12, cursor: 'pointer', border: custom ? `2px solid ${ORANGE}` : '1px solid rgba(255,255,255,0.06)', background: custom ? 'rgba(249,115,22,0.1)' : CARD, color: custom ? ORANGE : TXT, borderRadius: 12 }}>
            Custom
          </button>
        </div>
        {custom !== '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: TXT3, fontSize: 14 }}>$</span>
            <input type="number" min="1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom amount" className="dark-input tabular" style={{ flex: 1, minHeight: 48, padding: '12px 16px', fontSize: 16, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
          </div>
        )}
        <button onClick={() => startTip(finalAmount)} disabled={!finalAmount || finalAmount < 1} className="btn-primary" style={{ width: '100%', minHeight: 48 }}>
          Tip ${finalAmount || 0}
        </button>
      </div>
    );
  }

  if (!clientSecret && loading) {
    return (
      <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <div style={{ color: TXT3, fontSize: 14, marginTop: 8 }}>Loading tip payment...</div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{err || 'Could not load tip form.'}</p>
        <button onClick={() => setShowForm(false)} style={{ color: ORANGE, fontWeight: 600, fontSize: 14, background: 'transparent', border: 'none', cursor: 'pointer' }}>Back</button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="dark-card" style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: TXT2, fontSize: 14 }}>Online tipping unavailable. Please call (587) 325-0751.</p>
      </div>
    );
  }

  return (
    <div className="dark-card" style={{ padding: 20 }}>
      <div style={{ fontWeight: 600, color: TXT, marginBottom: 4 }}>Tip Your Crew</div>
      <div className="tabular" style={{ fontSize: 28, fontWeight: 800, color: ORANGE, marginBottom: 16 }}>${finalAmount.toFixed(2)}</div>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: ORANGE } } }}>
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
    setBusy(true); setErr(null);
    const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.origin + window.location.pathname } });
    if (result.error) { setErr(result.error.message); setBusy(false); }
    else { setDone(true); onDone(); }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💚</div>
        <div style={{ fontWeight: 600, color: TXT, fontSize: 18 }}>Tip received — thank you!</div>
        <div style={{ fontSize: 14, color: TXT2, marginTop: 4 }}>100% goes to your crew.</div>
      </div>
    );
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      {err && <p style={{ color: '#EF4444', fontSize: 14, marginTop: 8 }}>{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary" style={{ width: '100%', minHeight: 48, marginTop: 16 }}>
        {busy ? 'Processing...' : `Tip $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

// ── Contact Support ──
function ContactSupport() {
  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div className="dark-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Need Help?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <a href="tel:+15873250751" className="dark-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16, textDecoration: 'none', cursor: 'pointer' }}>
            <Phone size={24} color={ORANGE} />
            <span style={{ fontSize: 12, fontWeight: 600, color: TXT2 }}>Call</span>
          </a>
          <a href="sms:+15873250751" className="dark-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16, textDecoration: 'none', cursor: 'pointer' }}>
            <MessageSquare size={24} color={ORANGE} />
            <span style={{ fontSize: 12, fontWeight: 600, color: TXT2 }}>Text</span>
          </a>
          <a href="mailto:support@junkhaul.ca" className="dark-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16, textDecoration: 'none', cursor: 'pointer' }}>
            <Mail size={24} color={ORANGE} />
            <span style={{ fontSize: 12, fontWeight: 600, color: TXT2 }}>Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 24px 0' }}>
      <div style={{ fontSize: 12, color: TXT3 }}>junkhaul.ca · (587) 325-0751</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Calgary&apos;s trusted junk removal team</div>
    </div>
  );
}

// ── Helpers ──
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
}
