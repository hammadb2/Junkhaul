'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================================
// /portal/job — full job workflow stepper for the crew.
// En Route → Arrived → Payment → Load → Route → Drop → Signature → EOD
// ============================================================

const STEPS = [
  { key: 'enroute', label: 'En Route' },
  { key: 'arrived', label: 'Arrived / Load Verify' },
  { key: 'payment', label: 'Collect Payment' },
  { key: 'loaded', label: 'Load Truck' },
  { key: 'route', label: 'Route Decision' },
  { key: 'drop', label: 'Drop Required Flow' },
  { key: 'signature', label: 'Customer Signature' },
];

const FUEL_LEVELS = ['Empty', '1/4', '1/2', '3/4', 'Full'];

export default function JobFlowPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-400">Loading…</div>}>
      <JobFlowInner />
    </Suspense>
  );
}

function JobFlowInner() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('booking_id');
  const checkParam = params.get('check'); // 'pickup' | 'return'

  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Per-step state
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
  const [custName, setCustName] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState(null);

  // EOD truck return
  const [dashPhoto, setDashPhoto] = useState(null);
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [gasReceipt, setGasReceipt] = useState(null);
  const [gasAmount, setGasAmount] = useState('');
  const [dumpReceipt, setDumpReceipt] = useState(null);
  const [dumpAmount, setDumpAmount] = useState('');

  const sigCanvasRef = useRef(null);
  const drawingRef = useRef(false);

  // ---------- Load ----------
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

  // If check param present, jump to EOD section
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

  // Load landfill + storage when route step reached
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

  // ---------- Helpers ----------
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

  // ---------- Signature pad ----------
  const sigCanvas = sigCanvasRef.current;

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
    if (ctx && sigCanvasRef.current) {
      ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    }
    setSigDataUrl(null);
  };

  // ---------- Step actions ----------
  const markEnRoute = async () => {
    setBusy(true); setError('');
    const g = await getGPS();
    setGps(g);
    // No dedicated status endpoint; use job-clock to mark in_progress
    const res = await fetch('/api/employee/job-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, assignment_id: assignment?.id, action: 'in' }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok && res.status !== 409) { setError(d.error || 'Failed'); return; }
    if (navigator.vibrate) navigator.vibrate(50);
    setStepIdx(1);
  };

  const markArrived = async () => {
    setBusy(true); setError('');
    const g = await getGPS();
    setGps(g);
    setBusy(false);
    setStepIdx(2);
  };

  const collectPayment = async () => {
    if (!amountConfirmed) { setError('Enter confirmed amount'); return; }
    setStepIdx(3); // advance to Load Truck
  };

  const markLoaded = () => setStepIdx(4); // Route Decision

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
    setStepIdx(6); // signature
  };

  const skipDrop = () => setStepIdx(6);

  const completeJob = async () => {
    if (!custName) { setError('Customer must type their name'); return; }
    if (!amountConfirmed) { setError('Enter confirmed amount'); return; }
    // Capture signature canvas
    let sigUrl = sigDataUrl;
    if (!sigUrl && sigCanvasRef.current) {
      sigUrl = sigCanvasRef.current.toDataURL('image/png');
    }
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
    setStepIdx(STEPS.length); // EOD
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
    setError('');
    // Upload dump receipt if provided
    if (dumpReceipt && dumpAmount) {
      await fetch('/api/employee/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignment.id,
          receipt_type: 'dump',
          amount_cad: Number(dumpAmount),
          receipt_photo_url: dumpReceipt,
        }),
      });
    }
    router.push('/portal/schedule');
  };

  const logout = async () => {
    await fetch('/api/employee/logout', { method: 'POST' });
    router.push('/portal');
  };

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-400">Loading…</div>;
  }

  if (!booking) {
    return (
      <main className="min-h-dvh bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0">
          <button onClick={() => router.push('/portal/schedule')} className="text-gray-500 text-sm">‹ Schedule</button>
          <span className="font-bold text-gray-900">Job Flow</span>
          <button onClick={logout} className="text-gray-400 text-sm underline">Out</button>
        </header>
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            Job not found. <button onClick={() => router.push('/portal/schedule')} className="text-orange-600 underline">Back to schedule</button>
          </div>
        </div>
      </main>
    );
  }

  const mapsUrl = booking.address
    ? `https://maps.google.com/?q=${encodeURIComponent(booking.address)}`
    : null;
  const eod = stepIdx >= STEPS.length;

  return (
    <main className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.push('/portal/schedule')} className="text-gray-500 text-sm">‹ Schedule</button>
        <span className="font-bold text-gray-900 truncate max-w-[50%]">{booking.name}</span>
        <button onClick={logout} className="text-gray-400 text-sm underline">Out</button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>}

        {/* Customer summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-bold text-gray-900">{booking.name}</div>
          <div className="mt-1 text-sm space-y-1">
            {booking.phone && <a href={`tel:${booking.phone}`} className="block text-orange-600 font-medium">{booking.phone}</a>}
            {booking.address && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="block text-gray-700 underline">{booking.address}</a>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {booking.time_slot} · ${Number(booking.total_price || 0).toFixed(2)}
          </div>
        </div>

        {/* Stepper */}
        {!eod && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <ol className="space-y-0">
              {STEPS.map((s, i) => {
                const done = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <li key={s.key} className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? 'bg-green-500 text-white' : current ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${done ? 'text-gray-400 line-through' : current ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Step 1: En Route */}
        {!eod && stepIdx === 0 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-2">Step 1 · En Route</div>
            <p className="text-sm text-gray-500 mb-4">Mark when you&apos;re heading to the customer. We&apos;ll grab your GPS.</p>
            <button
              onClick={markEnRoute}
              disabled={busy}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {busy ? '…' : 'Mark En Route'}
            </button>
          </div>
        )}

        {/* Step 2: Arrived / Load Verification */}
        {!eod && stepIdx === 1 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-2">Step 2 · Arrived / Load Verification</div>
            <button
              onClick={markArrived}
              disabled={busy}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl mb-4 disabled:opacity-50"
            >
              {busy ? '…' : 'Mark Arrived'}
            </button>
            {items.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Quoted items — verify the load matches</div>
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5 mb-4">
                  {items.map((it, i) => (
                    <li key={i}>
                      {typeof it === 'string' ? it : `${it.qty || it.quantity || 1}× ${it.name || it.item || it.description || ''}`}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setStepIdx(2)}
                  className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl"
                >
                  Confirm Load Matches
                </button>
              </div>
            )}
            {items.length === 0 && (
              <button
                onClick={() => setStepIdx(2)}
                className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl"
              >
                Confirm Load
              </button>
            )}
          </div>
        )}

        {/* Step 3: Collect Payment */}
        {!eod && stepIdx === 2 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-2">Step 3 · Collect Payment</div>
            <div className="text-sm text-gray-500 mb-3">Collect payment before loading.</div>
            <div className="text-2xl font-bold text-gray-900 mb-4">${Number(booking.total_price || 0).toFixed(2)}</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Payment method</div>
                <div className="flex gap-2">
                  {['cash', 'card'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize ${
                        paymentMethod === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Amount confirmed ($)</div>
                <input
                  type="number"
                  step="0.01"
                  value={amountConfirmed}
                  onChange={(e) => setAmountConfirmed(e.target.value)}
                  placeholder={Number(booking.total_price || 0).toFixed(2)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <button
                onClick={collectPayment}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Load Truck */}
        {!eod && stepIdx === 3 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-2">Step 4 · Load Truck</div>
            <p className="text-sm text-gray-500 mb-4">Confirm all items are loaded into the truck.</p>
            <button
              onClick={markLoaded}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl"
            >
              Mark Loaded
            </button>
          </div>
        )}

        {/* Step 5: Route Decision */}
        {!eod && stepIdx === 4 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-3">Step 5 · Route Decision</div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900">Dump items → Landfill</div>
                {landfill ? (
                  <div className="mt-1 text-gray-600">
                    <div>{landfill.name}</div>
                    {landfill.address && <div>{landfill.address}</div>}
                    {landfill.distance_km != null && <div className="text-xs text-gray-400">{landfill.distance_km} km away</div>}
                    {landfill.lat && landfill.lng && (
                      <a
                        href={`https://maps.google.com/?daddr=${landfill.lat},${landfill.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 underline text-xs"
                      >
                        Directions ›
                      </a>
                    )}
                  </div>
                ) : <div className="text-gray-400 mt-1">Loading landfill…</div>}
                {landfill?.warnings?.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded p-1 mt-1">{w}</div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900">Donate items → Storage</div>
                <div className="text-gray-600 mt-1">Drop at storage facility for donation sorting.</div>
              </div>
            </div>
            <button
              onClick={() => setStepIdx(5)}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl mt-4"
            >
              Continue to Drop Flow
            </button>
          </div>
        )}

        {/* Step 6: Drop Required Flow */}
        {!eod && stepIdx === 5 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-3">Step 6 · Drop Required Flow</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Storage facility</div>
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white"
                >
                  <option value="">Select facility…</option>
                  {storageFacilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.current_usage_pct ?? '?'}% full)</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Item photos (multiple)</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const urls = await Promise.all(files.map(fileToDataUrl));
                    setItemPhotos((prev) => [...prev, ...urls]);
                  }}
                  className="block w-full text-xs text-gray-500"
                />
                {itemPhotos.length > 0 && <div className="text-xs text-gray-400 mt-1">{itemPhotos.length} photo(s) attached</div>}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Capacity photo</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => setCapacityPhoto(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)}
                  className="block w-full text-xs text-gray-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Capacity estimate (%)</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={capacityPct}
                  onChange={(e) => setCapacityPct(e.target.value)}
                  placeholder="e.g. 65"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <button
                onClick={recordDrop}
                disabled={busy}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {busy ? '…' : 'Record Drop'}
              </button>
              <button
                onClick={skipDrop}
                className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm"
              >
                No storage drop — landfill only
              </button>
              {landfill && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="font-medium text-gray-900">Landfill</div>
                  <div className="text-gray-600">{landfill.name} — {landfill.address}</div>
                  {landfill.lat && landfill.lng && (
                    <a href={`https://maps.google.com/?daddr=${landfill.lat},${landfill.lng}`} target="_blank" rel="noreferrer" className="text-orange-600 underline text-xs">Directions ›</a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Customer Signature */}
        {!eod && stepIdx === 6 && !checkParam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-3">Step 7 · Customer Signature</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Customer types full name</div>
                <input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Crew member</div>
                <input
                  value={emp?.name || ''}
                  disabled
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Amount confirmed ($)</div>
                <input
                  type="number"
                  step="0.01"
                  value={amountConfirmed}
                  onChange={(e) => setAmountConfirmed(e.target.value)}
                  placeholder={Number(booking.total_price || 0).toFixed(2)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Customer signature (draw below)</div>
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
                  className="w-full bg-white border border-gray-300 rounded-lg touch-none"
                  style={{ aspectRatio: '2 / 1' }}
                />
                <button onClick={clearSig} className="text-xs text-gray-500 underline mt-1">Clear signature</button>
              </div>
              <button
                onClick={completeJob}
                disabled={busy}
                className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {busy ? '…' : 'Complete Job'}
              </button>
            </div>
          </div>
        )}

        {/* EOD: Truck Return Check */}
        {eod && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="font-semibold text-gray-900 mb-1">End of Day · Truck Return Check</div>
            <p className="text-sm text-gray-500 mb-4">Complete the return check before clocking out.</p>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Dashboard photo</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => setDashPhoto(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)}
                  className="block w-full text-xs text-gray-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Odometer (km)</div>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="e.g. 14250"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Fuel level</div>
                <div className="flex gap-1 flex-wrap">
                  {FUEL_LEVELS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFuelLevel(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        fuelLevel === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Gas receipt photo</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => setGasReceipt(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)}
                  className="block w-full text-xs text-gray-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Gas amount ($)</div>
                <input
                  type="number"
                  step="0.01"
                  value={gasAmount}
                  onChange={(e) => setGasAmount(e.target.value)}
                  placeholder="e.g. 45.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs text-gray-400 mb-1">Dump receipt photo (optional)</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => setDumpReceipt(e.target.files?.[0] ? await fileToDataUrl(e.target.files[0]) : null)}
                  className="block w-full text-xs text-gray-500"
                />
                <div className="text-xs text-gray-400 mb-1 mt-2">Dump amount ($)</div>
                <input
                  type="number"
                  step="0.01"
                  value={dumpAmount}
                  onChange={(e) => setDumpAmount(e.target.value)}
                  placeholder="e.g. 35.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <button
                onClick={submitReturnCheck}
                disabled={busy}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {busy ? '…' : 'Submit Return Check'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
