'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Navigation, CreditCard, Banknote, Trash2, Warehouse, Camera, Check, CheckCircle, Eraser, Truck, ChevronRight, Send, MapPin, Flag } from 'lucide-react';

// ============================================================
// /portal/job — full job workflow stepper (dark theme).
// En Route -> Arrived -> Payment -> Load -> Route -> Drop -> Signature -> EOD
// ============================================================

const STEPS = [
  { key: 'enroute', label: 'En Route' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'payment', label: 'Payment' },
  { key: 'loaded', label: 'Load Truck' },
  { key: 'route', label: 'Route' },
  { key: 'drop', label: 'Drop Flow' },
  { key: 'signature', label: 'Signature' },
];

const FUEL_LEVELS = ['Empty', '1/4', '1/2', '3/4', 'Full'];

export default function JobFlowPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', color: 'rgba(0,0,0,.4)' }}>Loading...</div>}>
      <JobFlowInner />
    </Suspense>
  );
}

function JobFlowInner() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('booking_id');
  const checkParam = params.get('check');

  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');

  const [stepIdx, setStepIdx] = useState(0);
  const [gps, setGps] = useState(null);
  const [landfill, setLandfill] = useState(null);
  const [storageFacilities, setStorageFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [itemPhotos, setItemPhotos] = useState([]);
  const [capacityPhoto, setCapacityPhoto] = useState(null);
  const [capacityPct, setCapacityPct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [amountConfirmed, setAmountConfirmed] = useState('');
  const [loadConfirmed, setLoadConfirmed] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [itemConditions, setItemConditions] = useState({}); // { idx: 'good' | 'damaged' | 'missing' }
  const [custName, setCustName] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [jobComplete, setJobComplete] = useState(false);

  // Issue flag
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueType, setIssueType] = useState('access');
  const [issueSeverity, setIssueSeverity] = useState('medium');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // EOD
  const [dashPhoto, setDashPhoto] = useState(null);
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [gasReceipt, setGasReceipt] = useState(null);
  const [gasAmount, setGasAmount] = useState('');
  const [dumpReceipt, setDumpReceipt] = useState(null);
  const [dumpAmount, setDumpAmount] = useState('');

  const sigCanvasRef = useRef(null);
  const drawingRef = useRef(false);

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/employee/me');
    if (res.status === 401) { router.push('/portal'); return null; }
    const d = await res.json();
    setEmp(d.employee);
    if (d.employee && !d.employee.onboarded) { router.push('/portal/onboard'); return null; }
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

  useEffect(() => {
    if (checkParam === 'return') setStepIdx(STEPS.length);
  }, [checkParam]);

  const getGPS = useCallback(() =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60000 }
      );
    }), []);

  useEffect(() => {
    if (stepIdx < 4) return;
    (async () => {
      const g = gps || await getGPS();
      setGps(g);
      const qs = g.lat ? `?lat=${g.lat}&lng=${g.lng}` : '';
      const lr = await fetch(`/api/employee/landfill${qs}`);
      if (lr.ok) setLandfill((await lr.json()).recommended);
      const sr = await fetch('/api/employee/storage-drop');
      if (sr.ok) setStorageFacilities((await sr.json()).facilities || []);
    })();
  }, [stepIdx, gps, getGPS]);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const booking = (data?.bookings || []).find((b) => String(b.id) === String(bookingId));
  const assignment = data?.assignment || null;

  const items = booking ? (Array.isArray(booking.itemized_items)
    ? booking.itemized_items
    : (typeof booking.itemized_items === 'string'
        ? (() => { try { return JSON.parse(booking.itemized_items); } catch { return []; } })()
        : [])) : [];

  // Signature pad
  const getSigCtx = () => sigCanvasRef.current?.getContext('2d');

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = getSigCtx();
    if (!ctx) return;
    const rect = sigCanvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = getSigCtx();
    if (!ctx) return;
    const rect = sigCanvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => { drawingRef.current = false; };

  const clearSig = () => {
    const ctx = getSigCtx();
    if (ctx && sigCanvasRef.current) ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    setSigDataUrl(null);
  };

  const showConfirm = (msg) => {
    setConfirmMsg(msg);
    setTimeout(() => setConfirmMsg(''), 2000);
  };

  // Step actions
  const markEnRoute = async () => {
    setBusy(true); setError('');
    const g = await getGPS();
    setGps(g);
    const res = await fetch('/api/employee/job-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, assignment_id: assignment?.id, action: 'in' }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok && res.status !== 409) { setError(d.error || 'Failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    showConfirm('Customer notified');
    setTimeout(() => setStepIdx(1), 1200);
  };

  const markArrived = async () => {
    setBusy(true); setError('');
    const g = await getGPS();
    setGps(g);
    // Save item conditions if any were checked
    if (items.length > 0 && Object.keys(itemConditions).length > 0) {
      try {
        await fetch('/api/crew/item-conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: bookingId,
            conditions: itemConditions,
          }),
        });
      } catch (e) {
        console.error('Failed to save item conditions:', e);
      }
    }
    setBusy(false);
    showConfirm('Customer notified');
    setTimeout(() => setStepIdx(2), 1200);
  };

  const collectPayment = async () => {
    if (!amountConfirmed) { setError('Enter confirmed amount'); return; }
    setStepIdx(3);
  };

  const markLoaded = () => setStepIdx(4);

  const recordDrop = async () => {
    if (!selectedFacility) { setError('Select a storage facility'); return; }
    setBusy(true); setError('');
    const res = await fetch('/api/employee/storage-drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: assignment?.id,
        facility_id: selectedFacility,
        booking_id: bookingId,
        item_photos: itemPhotos,
        capacity_photo_url: capacityPhoto,
        capacity_estimate_pct: capacityPct ? Number(capacityPct) : null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || 'Drop failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    setStepIdx(6);
  };

  const skipDrop = () => setStepIdx(6);

  const completeJob = async () => {
    if (!custName) { setError('Customer must type their name'); return; }
    if (!amountConfirmed) { setError('Enter confirmed amount'); return; }
    let sigUrl = sigDataUrl;
    if (!sigUrl && sigCanvasRef.current) sigUrl = sigCanvasRef.current.toDataURL('image/png');
    setBusy(true); setError('');
    const res = await fetch('/api/employee/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        customer_name_typed: custName,
        customer_signature_url: sigUrl,
        amount_confirmed: Number(amountConfirmed),
        payment_method: paymentMethod,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || 'Signature failed'); return; }
    if (navigator.vibrate) navigator.vibrate([50, 40, 50]);
    setJobComplete(true);
    setTimeout(() => { setStepIdx(STEPS.length); setJobComplete(false); }, 2000);
  };

  const submitReturnCheck = async () => {
    if (!assignment?.id) { setError('No assignment'); return; }
    setBusy(true); setError('');
    const res = await fetch('/api/employee/truck-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: assignment.id,
        check_type: 'return',
        dashboard_photo_url: dashPhoto,
        odometer_km: odometer ? Number(odometer) : null,
        fuel_level: fuelLevel || null,
        gas_receipt_url: gasReceipt,
        gas_amount_cad: gasAmount ? Number(gasAmount) : null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || 'Return check failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    if (dumpReceipt && dumpAmount) {
      await fetch('/api/employee/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignment.id, receipt_type: 'dump', amount_cad: Number(dumpAmount), receipt_photo_url: dumpReceipt }),
      });
    }
    router.push('/portal/schedule');
  };

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  // ---------- Render ----------
  if (loading) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', color: 'rgba(0,0,0,.4)' }}>Loading...</div>;
  }

  if (!booking) {
    return (
      <main style={{ minHeight: '100dvh', background: '#FAFAFA' }} className="safe-top">
        <div style={{ maxWidth: 448, margin: '0 auto', padding: 24 }}>
          <div className="dark-card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ color: 'rgba(0,0,0,.6)', fontSize: 14, marginBottom: 16 }}>Job not found.</div>
            <button onClick={() => router.push('/portal/schedule')} className="btn-primary" style={{ minHeight: 48, width: '100%' }}>Back to schedule</button>
          </div>
        </div>
      </main>
    );
  }

  const eod = stepIdx >= STEPS.length;
  const mapsUrl = booking.address ? `https://maps.google.com/?q=${encodeURIComponent(booking.address)}` : null;

  // Issue flag overlay (rendered inside PageShell)
  const IssueFlagOverlay = () => {
    if (!showIssueForm) return null;
    const ISSUE_TYPES = [
      { value: 'access', label: 'Access', icon: '🚧' },
      { value: 'damage', label: 'Damage', icon: '🏠' },
      { value: 'safety', label: 'Safety', icon: '🦺' },
      { value: 'customer', label: 'Customer', icon: '👤' },
      { value: 'vehicle', label: 'Vehicle', icon: '🚛' },
      { value: 'other', label: 'Other', icon: '📋' },
    ];
    const SEVS = [
      { value: 'low', label: 'Low', color: '#22C55E' },
      { value: 'medium', label: 'Medium', color: '#F59E0B' },
      { value: 'high', label: 'High', color: '#EF4444' },
    ];
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowIssueForm(false)}>
        <div className="dark-card slide-up" style={{ width: '100%', maxWidth: 448, borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flag size={20} color="#f97316" /> Flag an Issue
            </div>
            <button onClick={() => setShowIssueForm(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginBottom: 16 }}>Report a problem with this job. Your supervisor will be notified immediately.</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {ISSUE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setIssueType(t.value)} className="dark-card" style={{ padding: 10, textAlign: 'center', cursor: 'pointer', border: issueType === t.value ? '2px solid #f97316' : '1px solid rgba(0,0,0,.06)', background: issueType === t.value ? 'rgba(249,115,22,0.08)' : '#fff' }}>
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: issueType === t.value ? '#f97316' : 'rgba(0,0,0,.6)', marginTop: 4 }}>{t.label}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>Severity</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {SEVS.map((s) => (
              <button key={s.value} onClick={() => setIssueSeverity(s.value)} className="dark-card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', border: issueSeverity === s.value ? `2px solid ${s.color}` : '1px solid rgba(0,0,0,.06)', background: issueSeverity === s.value ? `${s.color}15` : '#fff' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: issueSeverity === s.value ? s.color : 'rgba(0,0,0,.6)' }}>{s.label}</div>
              </button>
            ))}
          </div>
          <textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} placeholder="Describe the issue..." rows={3} className="dark-input" style={{ width: '100%', padding: '12px 16px', fontSize: 14, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, resize: 'none', marginBottom: 16 }} />
          <button
            onClick={async () => {
              setIssueSubmitting(true);
              try {
                await fetch('/api/employee/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: bookingId, issue_type: issueType, severity: issueSeverity, description: issueDesc }) });
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                setShowIssueForm(false); setIssueDesc('');
                showConfirm('Issue reported to supervisor');
              } catch {}
              setIssueSubmitting(false);
            }}
            disabled={issueSubmitting}
            className="btn-primary"
            style={{ width: '100%', minHeight: 48 }}
          >
            {issueSubmitting ? 'Submitting...' : 'Report Issue'}
          </button>
        </div>
      </div>
    );
  };

  // Shared components
  const PageShell = ({ children, onBack }) => (
    <main style={{ minHeight: '100dvh', background: '#FAFAFA' }} className="safe-top safe-bottom">
      {!eod && !checkParam && (
        <div className="progress-line" style={{ borderRadius: 0 }}>
          <div className="progress-line-fill" style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} />
        </div>
      )}
      {onBack && (
        <button onClick={onBack} className="glass-btn" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 16, zIndex: 20, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color="rgba(0,0,0,.6)" />
        </button>
      )}
      <button onClick={() => setShowIssueForm(true)} className="glass-btn" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, zIndex: 20, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Flag issue">
        <Flag size={20} color="rgba(0,0,0,.5)" />
      </button>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '24px', paddingBottom: 80 }}>
        {children}
      </div>
      <IssueFlagOverlay />
    </main>
  );

  const Headline = ({ title, subtitle }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 16, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );

  const BookingCard = () => (
    <div className="dark-card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <MapPin size={20} color="#f97316" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.address || 'No address'}</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 2 }}>
          {booking.time_slot} · <span className="tabular" style={{ fontWeight: 600, color: '#1a1a1a' }}>${Number(booking.total_price || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  const ErrorBanner = () => error ? (
    <div className="slide-up" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 14, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
      {error}
    </div>
  ) : null;

  const PrimaryBtn = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} className="btn-primary safe-bottom" style={{ width: '100%', minHeight: 52, fontSize: 16, position: 'sticky', bottom: 0 }}>
      {disabled ? '...' : children}
    </button>
  );

  const ConfirmOverlay = () => confirmMsg ? (
    <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ textAlign: 'center' }}>
        <CheckCircle size={64} color="#22C55E" className="celebrate" />
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginTop: 16 }}>{confirmMsg}</div>
      </div>
    </div>
  ) : null;

  // ===== STEP 0: En Route =====
  if (!eod && stepIdx === 0 && !checkParam) {
    return (
      <PageShell onBack={() => router.push('/portal/schedule')}>
        <BookingCard />
        <Headline title="On your way" subtitle="Let the customer know you're coming" />
        {items.length > 0 && (
          <div className="dark-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 8 }}>Items to pick up ({items.length})</div>
            {items.map((it, i) => {
              const label = typeof it === 'string' ? it : `${it.qty || it.quantity || 1}x ${it.name || it.item || it.description || ''}`;
              const isDonate = typeof it === 'object' && it.disposal === 'donate';
              const isFreon = typeof it === 'object' && it.is_freon;
              return (
                <div key={i} style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{label}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isDonate && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>DONATE</span>}
                    {isFreon && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>FREON</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <ErrorBanner />
        <PrimaryBtn onClick={markEnRoute} disabled={busy}>Mark En Route</PrimaryBtn>
        <ConfirmOverlay />
      </PageShell>
    );
  }

  // ===== STEP 1: Arrived =====
  if (!eod && stepIdx === 1 && !checkParam) {
    const allItemsChecked = items.length === 0 || items.every((_, i) => itemConditions[i]);
    return (
      <PageShell onBack={() => setStepIdx(0)}>
        <BookingCard />
        <Headline title="You've arrived" subtitle="Confirm item conditions" />
        <div className="dark-card" style={{ padding: 20, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Load size</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginTop: 4 }}>{booking.load_size || 'Standard'}</div>
        </div>
        {items.length > 0 && (
          <div className="dark-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginBottom: 12, fontWeight: 600 }}>
              Verify each item ({items.length})
            </div>
            {items.map((it, i) => {
              const label = typeof it === 'string' ? it : `${it.qty || it.quantity || 1}x ${it.name || it.item || it.description || ''}`;
              const isDonate = typeof it === 'object' && it.disposal === 'donate';
              const cond = itemConditions[i];
              return (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: '#1a1a1a', fontWeight: 500 }}>{label}</span>
                    {isDonate && (
                      <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        DONATE
                      </span>
                    )}
                    {typeof it === 'object' && it.is_freon && (
                      <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        FREON
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { key: 'good', label: 'Good', color: '#16a34a', bg: '#dcfce7' },
                      { key: 'damaged', label: 'Damaged', color: '#ea580c', bg: '#fed7aa' },
                      { key: 'missing', label: 'Missing', color: '#dc2626', bg: '#fecaca' },
                    ].map(({ key, label, color, bg }) => (
                      <button
                        key={key}
                        onClick={() => setItemConditions((p) => ({ ...p, [i]: key }))}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          border: cond === key ? `2px solid ${color}` : '1px solid rgba(0,0,0,.08)',
                          background: cond === key ? bg : '#F0F0F2',
                          color: cond === key ? color : 'rgba(0,0,0,.5)',
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {cond === 'damaged' && (
                    <input
                      type="text"
                      placeholder="What's damaged?"
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid rgba(0,0,0,.1)',
                        background: '#F0F0F2',
                        color: '#1a1a1a',
                      }}
                      onChange={(e) => setItemConditions((p) => ({ ...p, [`${i}_note`]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {items.length > 0 && !allItemsChecked && (
          <div style={{ fontSize: 13, color: '#ea580c', textAlign: 'center', marginBottom: 12 }}>
            Confirm condition of all items before continuing
          </div>
        )}
        <ErrorBanner />
        <PrimaryBtn
          onClick={markArrived}
          disabled={busy || (items.length > 0 && !allItemsChecked)}
        >
          {items.length > 0 ? 'Confirm & Continue' : 'Mark Arrived'}
        </PrimaryBtn>
        <ConfirmOverlay />
      </PageShell>
    );
  }

  // ===== STEP 2: Payment =====
  if (!eod && stepIdx === 2 && !checkParam) {
    return (
      <PageShell onBack={() => setStepIdx(1)}>
        <BookingCard />
        <Headline title="Collect payment" subtitle="How is the customer paying?" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'card', label: 'Card', icon: CreditCard },
            { key: 'cash', label: 'Cash', icon: Banknote },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPaymentMethod(key)}
              className="dark-card"
              style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', border: paymentMethod === key ? '2px solid #f97316' : '1px solid rgba(0,0,0,.06)', background: paymentMethod === key ? 'rgba(249,115,22,0.05)' : '#fff', borderRadius: 16 }}
            >
              <Icon size={28} color={paymentMethod === key ? '#f97316' : 'rgba(0,0,0,.6)'} />
              <span style={{ fontSize: 16, fontWeight: 600, color: paymentMethod === key ? '#f97316' : '#1a1a1a' }}>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Amount confirmed ($)</label>
          <input type="number" step="0.01" value={amountConfirmed} onChange={(e) => setAmountConfirmed(e.target.value)} placeholder={Number(booking.total_price || 0).toFixed(2)} className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 20, fontWeight: 600, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
        </div>
        <button onClick={() => { setError(''); fetch('/api/crew/resend-payment-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: bookingId }) }).then(() => showConfirm('Link sent')).catch(() => {}); }} style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', fontSize: 13, padding: '8px 0', marginBottom: 16, cursor: 'pointer' }}>
          Resend payment link
        </button>
        <ErrorBanner />
        <PrimaryBtn onClick={collectPayment}>Confirm Payment</PrimaryBtn>
        <ConfirmOverlay />
      </PageShell>
    );
  }

  // ===== STEP 3: Load Truck =====
  if (!eod && stepIdx === 3 && !checkParam) {
    return (
      <PageShell onBack={() => setStepIdx(2)}>
        <BookingCard />
        <Headline title="Load the truck" subtitle="Check off items as you load" />
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {items.map((it, i) => {
              const label = typeof it === 'string' ? it : `${it.qty || it.quantity || 1}x ${it.name || it.item || it.description || ''}`;
              const checked = !!checkedItems[i];
              const isDonate = typeof it === 'object' && it.disposal === 'donate';
              const isFreon = typeof it === 'object' && it.is_freon;
              const cond = typeof it === 'object' ? it.crew_condition : null;
              const condNote = typeof it === 'object' ? it.crew_condition_note : null;
              return (
                <button
                  key={i}
                  onClick={() => setCheckedItems((p) => ({ ...p, [i]: !p[i] }))}
                  className="dark-card"
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', border: checked ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(0,0,0,.06)', background: checked ? 'rgba(34,197,94,0.05)' : '#fff', borderRadius: 14 }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 6, border: checked ? 'none' : '2px solid rgba(0,0,0,.15)', background: checked ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <Check size={16} color="white" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, color: '#1a1a1a' }}>{label}</span>
                      {isDonate && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>DONATE</span>}
                      {isFreon && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>FREON</span>}
                    </div>
                    {cond === 'damaged' && <div style={{ fontSize: 12, color: '#ea580c', marginTop: 2 }}>Damaged{condNote ? `: ${condNote}` : ''}</div>}
                    {cond === 'missing' && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>Missing</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <ErrorBanner />
        <PrimaryBtn onClick={markLoaded}>Load Confirmed</PrimaryBtn>
      </PageShell>
    );
  }

  // ===== STEP 4: Route Decision =====
  if (!eod && stepIdx === 4 && !checkParam) {
    return (
      <PageShell onBack={() => setStepIdx(3)}>
        <BookingCard />
        <Headline title="Where to next?" subtitle="Choose your drop-off destination" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {/* Landfill card */}
          <div className="dark-card" style={{ padding: 16 }}>
            <Trash2 size={24} color="#f97316" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Landfill</div>
            {landfill ? (
              <>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{landfill.name}</div>
                {landfill.distance_km != null && <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }} className="tabular">{landfill.distance_km} km</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,.6)' }}>Open</span>
                </div>
                {landfill.lat && landfill.lng && (
                  <a href={`https://maps.google.com/?daddr=${landfill.lat},${landfill.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#f97316', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>Directions <ChevronRight size={14} /></a>
                )}
              </>
            ) : <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', marginTop: 4 }}>Loading...</div>}
          </div>
          {/* Storage card */}
          <div className="dark-card" style={{ padding: 16 }}>
            <Warehouse size={24} color="rgba(0,0,0,.6)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Storage</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>Drop for donation sorting</div>
            {storageFacilities.length > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{storageFacilities.length} facilities</div>
            )}
          </div>
        </div>
        {landfill?.warnings?.map((w, i) => (
          <div key={i} style={{ fontSize: 12, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>{w}</div>
        ))}
        <ErrorBanner />
        <PrimaryBtn onClick={() => setStepIdx(5)}>Continue to Drop Flow</PrimaryBtn>
      </PageShell>
    );
  }

  // ===== STEP 5: Drop Flow =====
  if (!eod && stepIdx === 5 && !checkParam) {
    return (
      <PageShell onBack={() => setStepIdx(4)}>
        <BookingCard />
        <Headline title="Record your drop" subtitle="Photos and capacity check" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Storage facility</label>
          <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)} className="dark-input" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }}>
            <option value="">Select facility...</option>
            {storageFacilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.current_usage_pct ?? '?'}% full)</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Item photos</label>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={async (e) => { const files = Array.from(e.target.files || []); const urls = await Promise.all(files.map(fileToDataUrl)); setItemPhotos((prev) => [...prev, ...urls]); }} />
            <div className="dark-card" style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Camera size={24} color="#f97316" />
              <span style={{ fontSize: 14, color: 'rgba(0,0,0,.6)' }}>Take photos</span>
            </div>
          </label>
          {itemPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {itemPhotos.map((p, i) => (
                <div key={i} style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color="white" /></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Capacity photo</label>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => setCapacityPhoto(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)} />
            <div className="dark-card" style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Camera size={24} color={capacityPhoto ? '#22C55E' : '#f97316'} />
              <span style={{ fontSize: 14, color: 'rgba(0,0,0,.6)' }}>{capacityPhoto ? 'Photo taken' : 'Take photo'}</span>
            </div>
          </label>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Capacity estimate (%)</label>
          <input type="number" min="0" max="100" value={capacityPct} onChange={(e) => setCapacityPct(e.target.value)} placeholder="e.g. 65" className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
        </div>
        <ErrorBanner />
        <PrimaryBtn onClick={recordDrop} disabled={busy}>Record Drop</PrimaryBtn>
        <button onClick={skipDrop} className="btn-ghost" style={{ width: '100%', minHeight: 48, fontSize: 14, marginTop: 8 }}>No storage drop — landfill only</button>
        {landfill && (
          <div className="dark-card" style={{ padding: 16, marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Landfill</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{landfill.name} — {landfill.address}</div>
            {landfill.lat && landfill.lng && (
              <a href={`https://maps.google.com/?daddr=${landfill.lat},${landfill.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#f97316', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>Directions <ChevronRight size={14} /></a>
            )}
          </div>
        )}
      </PageShell>
    );
  }

  // ===== STEP 6: Signature =====
  if (!eod && stepIdx === 6 && !checkParam) {
    return (
      <PageShell onBack={() => setStepIdx(5)}>
        <Headline title="Customer signature" subtitle="Have the customer sign below" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Customer name</label>
          <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer full name" className="dark-input" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', marginBottom: 16 }}>Crew: {emp?.name || ''}</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', display: 'block', marginBottom: 6 }}>Amount confirmed ($)</label>
          <input type="number" step="0.01" value={amountConfirmed} onChange={(e) => setAmountConfirmed(e.target.value)} placeholder={Number(booking.total_price || 0).toFixed(2)} className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <canvas
            ref={sigCanvasRef}
            width={320}
            height={160}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            style={{ width: '100%', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, touchAction: 'none', aspectRatio: '2 / 1' }}
          />
          <button onClick={clearSig} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: 'rgba(0,0,0,.4)', cursor: 'pointer', padding: 4 }}>
            <Eraser size={18} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginBottom: 16 }}>Draw signature above</div>
        <ErrorBanner />
        <PrimaryBtn onClick={completeJob} disabled={busy}>Complete Job</PrimaryBtn>
        {jobComplete && (
          <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={64} color="#22C55E" className="celebrate" />
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginTop: 16 }}>Job complete!</div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // ===== EOD: Truck Return Check =====
  if (eod) {
    return (
      <PageShell onBack={() => router.push('/portal/schedule')}>
        <Headline title="End of day check" subtitle="Truck return inspection" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {/* Dashboard photo */}
          <div className="dark-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Dashboard photo</div>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => setDashPhoto(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {dashPhoto ? <img src={dashPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} color="#f97316" />}
                </div>
                <span style={{ fontSize: 14, color: dashPhoto ? '#22C55E' : 'rgba(0,0,0,.6)' }}>{dashPhoto ? 'Photo taken' : 'Capture'}</span>
              </div>
            </label>
          </div>
          {/* Odometer */}
          <div className="dark-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Odometer (km)</div>
            <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="e.g. 14250" className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
          </div>
          {/* Fuel gauge */}
          <div className="dark-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Fuel level</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {FUEL_LEVELS.map((f, i) => (
                <button
                  key={f}
                  onClick={() => setFuelLevel(f)}
                  style={{
                    flex: 1, height: 48, borderRadius: 8, border: 'none',
                    background: fuelLevel === f ? '#f97316' : i < FUEL_LEVELS.indexOf(fuelLevel) ? 'rgba(249,115,22,0.3)' : 'rgba(0,0,0,.06)',
                    color: fuelLevel === f ? 'white' : 'rgba(0,0,0,.6)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Gas receipt + amount */}
          <div className="dark-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Gas receipt</div>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => setGasReceipt(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {gasReceipt ? <img src={gasReceipt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} color="#f97316" />}
                </div>
                <span style={{ fontSize: 14, color: gasReceipt ? '#22C55E' : 'rgba(0,0,0,.6)' }}>{gasReceipt ? 'Photo taken' : 'Capture'}</span>
              </div>
            </label>
            <input type="number" step="0.01" value={gasAmount} onChange={(e) => setGasAmount(e.target.value)} placeholder="Gas amount $" className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
          </div>
          {/* Dump receipt + amount */}
          <div className="dark-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Dump receipt (optional)</div>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => setDumpReceipt(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {dumpReceipt ? <img src={dumpReceipt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} color="#f97316" />}
                </div>
                <span style={{ fontSize: 14, color: dumpReceipt ? '#22C55E' : 'rgba(0,0,0,.6)' }}>{dumpReceipt ? 'Photo taken' : 'Capture'}</span>
              </div>
            </label>
            <input type="number" step="0.01" value={dumpAmount} onChange={(e) => setDumpAmount(e.target.value)} placeholder="Dump amount $" className="dark-input tabular" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 16, color: '#1a1a1a', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12 }} />
          </div>
        </div>
        <ErrorBanner />
        <PrimaryBtn onClick={submitReturnCheck} disabled={busy}>Submit Return Check</PrimaryBtn>
      </PageShell>
    );
  }

  return null;
}
