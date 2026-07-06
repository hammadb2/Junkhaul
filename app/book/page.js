'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import {
  BookButton,
  LoadCard,
  SlotPill,
  AnimatedPrice,
  ProgressBar,
  pageVariants,
} from '@/components/motion';
import PaymentStep from '@/components/booking/PaymentStep';
import Confirmation from '@/components/booking/Confirmation';
import { calculatePrice, PRICING, LOAD_LABELS } from '@/lib/pricing';

const LOADS = [
  { key: 'single_item', title: '1–2 items', desc: 'Couch, mattress, single appliance', price: 99 },
  { key: 'quarter', title: 'Small load', desc: 'A few items + boxes', price: 160 },
  { key: 'half', title: 'Half load', desc: 'Half a 15ft truck', price: 240 },
  { key: 'full', title: 'Full load', desc: 'Garage / estate cleanout', price: 380 },
];

const STEPS = ['phone', 'photos', 'load', 'schedule', 'details', 'payment', 'done'];

const todayEdmonton = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
};

export default function BookPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return crypto.randomUUID();
    const existing = localStorage.getItem('jh_session');
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem('jh_session', id);
    return id;
  });
  const [capturedPhone, setCapturedPhone] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('jh_phone') || '' : ''
  );
  const [step, setStep] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('jh_phone') ? 'photos' : 'phone'
  );
  const [state, setState] = useState({
    photos: [],
    photoUrls: [],
    photo_skipped: false,
    description_text: '',
    analysis: null,
    load_size: 'quarter',
    same_day: false,
    stairs: 0,
    stairs_confirmed: false,
    has_freon: false,
    freon_count: 0,
    job_date: null,
    job_time: null,
    name: '',
    phone: '',
    email: '',
    address: '',
    unit: '',
    address_data: null, // full Mapbox feature with coords, postal code, etc.
    is_apartment: false, // detected from address type
  });
  const [booking, setBooking] = useState(null);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const stepIndex = STEPS.indexOf(step);

  const price = calculatePrice({
    load_size: state.load_size,
    same_day: state.same_day,
    stairs: state.stairs,
    has_freon: state.has_freon,
    freon_count: state.freon_count,
    job_date: state.job_date,
    job_time: state.job_time,
  });

  return (
    <main className="min-h-dvh flex flex-col px-6 py-5 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Logo className="h-7" showWordmark={false} />
        </Link>
        {step !== 'done' && (
          <div className="flex gap-1">
            {STEPS.slice(1, 6).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full ${
                  i <= stepIndex ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1"
        >
          {step === 'phone' && (
            <PhoneStep
              sessionId={sessionId}
              onNext={(phone) => {
                setCapturedPhone(phone);
                setStep('photos');
              }}
            />
          )}
          {step === 'photos' && (
            <PhotoStep
              state={state}
              update={update}
              capturedPhone={capturedPhone}
              sessionId={sessionId}
              onNext={() => setStep('load')}
            />
          )}
          {step === 'load' && (
            <LoadStep
              state={state}
              update={update}
              price={price}
              onNext={() => setStep('schedule')}
            />
          )}
          {step === 'schedule' && (
            <ScheduleStep
              state={state}
              update={update}
              onNext={() => setStep('details')}
            />
          )}
          {step === 'details' && (
            <DetailsStep
              state={state}
              update={update}
              price={price}
              onCreated={(b) => {
                setBooking(b);
                setStep('payment');
                if (capturedPhone) {
                  fetch('/api/capture-lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: capturedPhone, session_id: sessionId, action: 'convert', booking_id: b.id }),
                  }).catch(() => {});
                  localStorage.removeItem('jh_session');
                  localStorage.removeItem('jh_phone');
                }
              }}
            />
          )}
          {step === 'payment' && booking && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Confirm & pay</h2>
              <p className="text-gray-500 text-sm mb-5">
                Just a $50 deposit today, the rest on pickup day.
              </p>
              <PaymentStep
                clientSecret={booking.client_secret}
                total={booking.total}
                balance_due={booking.balance_due}
                onPaid={() => {
                  setBooking((b) => ({
                    ...b,
                    job_date: state.job_date,
                    job_time: state.job_time,
                    address: state.unit ? `${state.unit}-${state.address}` : state.address,
                    phone: state.phone,
                  }));
                  setStep('done');
                }}
              />
            </div>
          )}
          {step === 'done' && booking && <Confirmation booking={booking} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

// ============================================================
// STEP 0 — PHONE CAPTURE
// ============================================================
function PhoneStep({ sessionId, onNext }) {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Format phone as (XXX) XXX-XXXX while typing
  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Strip formatting to get raw digits for storage/sending
  const rawPhone = phone.replace(/\D/g, '');
  const valid = rawPhone.length === 10;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const phoneToSend = `+1${rawPhone}`;
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToSend, session_id: sessionId, action: 'init', source: 'web' }),
      });
      if (!res.ok) throw new Error('Failed');
      localStorage.setItem('jh_phone', phoneToSend);
      onNext(phoneToSend);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Get your instant price</h2>
        <p className="mt-2 text-gray-500 text-sm">Enter your number and we&apos;ll text you your quote. No spam, ever.</p>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="(587) 000-0000"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && valid && submit()}
        className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-lg font-medium"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <BookButton disabled={!valid || submitting} onClick={submit}>
        {submitting ? 'One sec…' : 'Get my price →'}
      </BookButton>
      <p className="text-center text-xs text-gray-400">
        By continuing you agree to receive texts about your booking. Standard rates may apply.
      </p>
    </div>
  );
}

// ============================================================
// STEP 1 — PHOTOS
// ============================================================
function PhotoStep({ state, update, capturedPhone, sessionId, onNext }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showDescribe, setShowDescribe] = useState(false);
  const fileRef = useRef(null);

  // Resize + compress images client-side before base64 encoding.
  // Phone photos are 3-10MB each; without this the /api/analyze request
  // body blows past Vercel's 4.5MB limit and Groq's payload limits.
  const toCompressedBase64 = (file, maxDim = 1024, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const existing = state.photos || [];
    const remaining = 5 - existing.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;
    const base64s = await Promise.all(toAdd.map((f) => toCompressedBase64(f)));
    const allPhotos = [...existing, ...base64s];
    update({ photos: allPhotos });
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    const photos = (state.photos || []).filter((_, i) => i !== idx);
    update({ photos });
  };

  const analyzePhotos = () => {
    if (!state.photos || state.photos.length === 0) return;
    analyze(state.photos, null);
  };

  const analyze = async (photos, description) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photos ? { photos } : { description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      update({
        analysis: data.analysis,
        load_size: data.analysis.load_size,
        has_freon: data.analysis.has_freon || false,
        freon_count: data.analysis.freon_count || (data.analysis.has_freon ? 1 : 0),
        photoUrls: data.photoUrls || [],
        photo_skipped: false,
      });
      if (capturedPhone && data.analysis) {
        const priceEstimate = calculatePrice({
          load_size: data.analysis.load_size,
          same_day: false,
          stairs: 0,
          has_freon: data.analysis.has_freon || false,
          freon_count: data.analysis.freon_count || (data.analysis.has_freon ? 1 : 0),
        });
        fetch('/api/capture-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: capturedPhone,
            session_id: sessionId,
            action: 'price_reveal',
            ai_price_estimate: priceEstimate.total,
            load_size: data.analysis.load_size,
          }),
        }).catch(() => {});
      }
      setTimeout(onNext, 400);
    } catch (err) {
      setError(err.message || 'Could not analyse. Pick your size manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Snap your junk</h2>
        <p className="text-gray-500 text-sm mt-1">
          Photos give you an instant, accurate price. Takes 10 seconds.
        </p>
      </div>

      {analyzing ? (
        <div className="py-10 text-center space-y-4">
          <p className="text-gray-700 font-medium">Analysing your photos…</p>
          <ProgressBar />
          <p className="text-xs text-gray-400">Estimating load size & price</p>
        </div>
      ) : (
        <>
          {state.photos && state.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {state.photos.map((p, i) => (
                <div key={i} className="relative">
                  <img
                    src={`data:image/jpeg;base64,${p}`}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFiles}
          />

          {(state.photos || []).length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl py-8 flex flex-col items-center gap-1 text-gray-500"
            >
              <span className="text-3xl">📷</span>
              <span className="font-semibold text-gray-700">
                {(state.photos || []).length === 0 ? 'Take / upload photos' : 'Add more photos'}
              </span>
              <span className="text-xs">{5 - (state.photos || []).length} of 5 remaining</span>
            </button>
          )}

          {(state.photos || []).length > 0 && (
            <BookButton onClick={analyzePhotos}>
              Get my price from {(state.photos || []).length} photo{(state.photos || []).length > 1 ? 's' : ''} →
            </BookButton>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {showDescribe ? (
            <div className="space-y-3">
              <textarea
                value={state.description_text}
                onChange={(e) => update({ description_text: e.target.value })}
                placeholder="e.g. Old sofa, a fridge, and about 10 boxes of stuff from the garage"
                className="w-full border border-gray-300 rounded-xl p-3 text-sm h-28"
              />
              <BookButton
                disabled={!state.description_text.trim()}
                onClick={() => analyze(null, state.description_text)}
              >
                Get my price →
              </BookButton>
            </div>
          ) : (
            <button
              onClick={() => setShowDescribe(true)}
              className="text-sm text-gray-500 underline"
            >
              Or describe it in words instead
            </button>
          )}

          <button
            onClick={() => {
              update({ photo_skipped: true });
              onNext();
            }}
            className="text-sm text-gray-400"
          >
            Skip, I&apos;ll pick my load size myself
          </button>

          <a
            href="tel:+15873250751"
            className="text-sm text-orange-600 font-medium underline text-center"
          >
            Prefer to call? Ring us, we&apos;ll price it over the phone
          </a>
        </>
      )}
    </div>
  );
}

// ============================================================
// STEP 2 — LOAD SIZE + ADD-ONS
// ============================================================
function LoadStep({ state, update, price, onNext }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your load</h2>
        {state.analysis && (
          <p className="text-gray-500 text-sm mt-1">
            We estimated <b>{LOAD_LABELS[state.analysis.load_size]}</b>
            {state.analysis.confidence ? ` (${state.analysis.confidence} confidence)` : ''}.
            Adjust if needed.
          </p>
        )}
      </div>

      {/* Itemized AI breakdown */}
      {state.analysis?.items_detected?.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-900">Here&apos;s what we see in your photos:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            {state.analysis.items_detected.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                  {item.is_freon && <span className="text-blue-600 font-medium"> (freon +${PRICING.freon_per_item})</span>}
                  {item.is_hazmat && <span className="text-red-600 font-medium"> (cannot take)</span>}
                  {item.estimated_weight_kg && <span className="text-blue-400"> ~{item.estimated_weight_kg}kg</span>}
                </span>
              </li>
            ))}
          </ul>
          {state.analysis.notes && (
            <p className="text-xs text-blue-600 italic">{state.analysis.notes}</p>
          )}
          {state.analysis.has_hazmat && (
            <p className="text-xs text-red-600 font-medium bg-red-50 rounded p-2">
              ⚠️ We cannot take hazmat items (paint, chemicals, propane, tires). Please remove them before pickup.
            </p>
          )}
          <p className="text-xs text-blue-500">Wrong? Adjust your load size and add-ons below.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {LOADS.map((l) => (
          <LoadCard
            key={l.key}
            selected={state.load_size === l.key}
            onClick={() => update({ load_size: l.key })}
          >
            <div className="font-semibold text-gray-900">{l.title}</div>
            <div className="text-xs text-gray-500 mt-0.5 h-8">{l.desc}</div>
            <div className="font-bold text-orange-500 mt-1">${l.price}</div>
          </LoadCard>
        ))}
      </div>

      <div className="space-y-3 mt-2">
        {/* Freon: per-item count */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Freon appliances</div>
            <div className="text-xs text-gray-500">
              Fridge, freezer, AC, water cooler. +${PRICING.freon_per_item} each
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => update({
                freon_count: Math.max(0, state.freon_count - 1),
                has_freon: Math.max(0, state.freon_count - 1) > 0,
              })}
              className="w-8 h-8 rounded-full border border-gray-300 text-lg"
            >
              −
            </button>
            <span className="w-4 text-center">{state.freon_count}</span>
            <button
              onClick={() => update({
                freon_count: state.freon_count + 1,
                has_freon: true,
              })}
              className="w-8 h-8 rounded-full border border-gray-300 text-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Stairs: with confirmation */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Stairs (flights)</div>
            <div className="text-xs text-gray-500">
              +${PRICING.stairs_per_flight} per flight
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => update({ stairs: Math.max(0, state.stairs - 1) })}
              className="w-8 h-8 rounded-full border border-gray-300 text-lg"
            >
              −
            </button>
            <span className="w-4 text-center">{state.stairs}</span>
            <button
              onClick={() => update({ stairs: state.stairs + 1 })}
              className="w-8 h-8 rounded-full border border-gray-300 text-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Stairs confirmation when 0 */}
        {state.stairs === 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
            <input
              type="checkbox"
              checked={state.stairs_confirmed}
              onChange={(e) => update({ stairs_confirmed: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            I confirm there are no stairs at my pickup location
          </label>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-gray-500">Your price</span>
        <span className="text-3xl font-bold text-gray-900">
          $<AnimatedPrice price={price.total} />
        </span>
      </div>

      {/* Price breakdown */}
      <div className="text-xs text-gray-400 space-y-0.5">
        <div className="flex justify-between"><span>Base ({LOAD_LABELS[state.load_size]})</span><span>${price.base_price}</span></div>
        {price.freon_fee > 0 && <div className="flex justify-between"><span>Freon ({state.freon_count} item{state.freon_count > 1 ? 's' : ''})</span><span>${price.freon_fee}</span></div>}
        {price.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({state.stairs} flight{state.stairs > 1 ? 's' : ''})</span><span>${price.stairs_fee}</span></div>}
        {price.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${price.same_day_fee}</span></div>}
        <div className="flex justify-between font-medium text-gray-600 pt-1 border-t"><span>Deposit today</span><span>$50</span></div>
        <div className="flex justify-between font-medium text-gray-600"><span>Balance on pickup</span><span>${price.balance_due}</span></div>
      </div>

      <BookButton onClick={onNext}>Choose a time →</BookButton>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition-colors ${
          checked ? 'bg-orange-500' : 'bg-gray-300'
        } relative`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================
// STEP 3 — SCHEDULE
// ============================================================
function ScheduleStep({ state, update, onNext }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);

  useEffect(() => {
    fetch('/api/slots')
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days || []);
        if (data.days?.length) setActiveDay(data.days[0].date);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = todayEdmonton();
  const day = days.find((d) => d.date === activeDay);

  const pick = (date, time) => {
    update({ job_date: date, job_time: time, same_day: date === today });
  };

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading available times…</p>;

  if (days.length === 0) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-gray-700 font-medium">No open slots right now.</p>
        <Link href="/waitlist" className="text-orange-600 font-semibold">
          Join the waitlist →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-gray-900">Pick a time</h2>
      <p className="text-gray-500 text-sm -mt-2">We run Thursdays and Sundays. Same-day available if you book before 11 AM.</p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => setActiveDay(d.date)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              activeDay === d.date
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {d.label}
            {d.date === today && <span className="ml-1 text-orange-400">⚡</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {day?.slots.map((s) => (
          <SlotPill
            key={s.time}
            time={s.label}
            available
            sameDay={activeDay === today}
            selected={state.job_date === activeDay && state.job_time === s.time}
            onClick={() => pick(activeDay, s.time)}
          />
        ))}
      </div>

      {state.same_day && (
        <p className="text-xs text-orange-600">
          ⚡ Same-day pickup adds ${PRICING.same_day}.
        </p>
      )}

      <BookButton disabled={!state.job_time} onClick={onNext}>
        Continue →
      </BookButton>
    </div>
  );
}

// ============================================================
// STEP 4 — DETAILS
// ============================================================
function DetailsStep({ state, update, price, onCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const valid =
    state.name.trim() &&
    /^\+?[\d\s\-()]{10,}$/.test(state.phone) &&
    state.address.trim();

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name,
          phone: state.phone,
          email: state.email || null,
          address: state.address,
          unit: state.unit || null,
          address_data: state.address_data || null,
          is_apartment: state.is_apartment || false,
          load_size: state.load_size,
          same_day: state.same_day,
          stairs: state.stairs,
          has_freon: state.has_freon,
          freon_count: state.freon_count,
          job_date: state.job_date,
          job_time: state.job_time,
          photos: state.photoUrls,
          photo_skipped: state.photo_skipped,
          description_text: state.description_text || null,
          ai_load_estimate: state.analysis?.load_size || null,
          ai_weight_estimate_kg: state.analysis?.estimated_weight_kg || null,
          ai_confidence: state.analysis?.confidence || null,
          has_hazmat: state.analysis?.has_hazmat || false,
          hazmat_description: state.analysis?.hazmat_description || null,
          flag_for_review: state.analysis?.flag_for_review || false,
          flag_reason: state.analysis?.flag_reason || null,
          source: 'web',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create booking.');
      onCreated(data);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-gray-900">Where & who</h2>

      <Field label="Full name" value={state.name} onChange={(v) => update({ name: v })} placeholder="Jane Doe" />
      <Field
        label="Mobile number"
        value={state.phone}
        onChange={(v) => update({ phone: v })}
        placeholder="+1 403 555 0123"
        type="tel"
      />
      <Field
        label="Email (optional)"
        value={state.email}
        onChange={(v) => update({ email: v })}
        placeholder="you@email.com"
        type="email"
      />
      <AddressField
        label="Pickup address"
        value={state.address}
        onChange={(v, data) => {
          if (data) {
            // Full address selected from Mapbox — extract all details
            const ctx = (data.context || []).reduce((acc, c) => {
              const key = c.id.split('.')[0];
              acc[key] = c.text;
              return acc;
            }, {});
            const isApt = ['apartments', 'residential', 'condominium', 'building'].some(
              (t) => (data.place_type || []).includes(t)
            ) || /apt|apartment|condo|unit|suite|tower|building|complex/i.test(data.text || '');
            update({
              address: data.place_name,
              address_data: {
                full_address: data.place_name,
                street: data.text,
                postal_code: ctx.postcode || '',
                city: ctx.place || 'Calgary',
                province: ctx.region || 'Alberta',
                country: ctx.country || 'Canada',
                lat: data.center?.[1] || null,
                lng: data.center?.[0] || null,
                place_id: data.id,
              },
              is_apartment: isApt,
              // Auto-apply 1 flight of stairs for apartments unless user already confirmed no stairs
              stairs: isApt && !state.stairs_confirmed ? Math.max(state.stairs, 1) : state.stairs,
            });
          } else {
            // User is typing manually
            update({ address: v, address_data: null, is_apartment: false });
          }
        }}
        placeholder="123 5 Ave NE, Calgary"
      />
      {state.is_apartment && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <p className="text-sm font-medium text-orange-700">
            This looks like an apartment or condo. We need your unit number.
          </p>
          <input
            type="text"
            value={state.unit}
            onChange={(e) => update({ unit: e.target.value })}
            placeholder="Apt 204, Unit 15, Suite 301..."
            className="w-full border border-orange-300 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <p className="text-xs text-orange-600">
            A stair charge of $25 (1 flight) has been added. If there are no stairs or an elevator, tap &quot;No stairs&quot; below.
          </p>
          <button
            type="button"
            onClick={() => update({ stairs: 0, stairs_confirmed: true })}
            className="text-xs font-medium text-orange-700 underline"
          >
            No stairs / has elevator
          </button>
        </div>
      )}
      {!state.is_apartment && (
        <Field
          label="Unit / buzzer (optional)"
          value={state.unit}
          onChange={(v) => update({ unit: v })}
          placeholder="Apt 204"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex items-end justify-between">
        <span className="text-gray-500 text-sm">Deposit today $50 · Total ${price.total}</span>
      </div>

      <BookButton disabled={!valid || submitting} onClick={submit}>
        {submitting ? 'Creating booking…' : 'Continue to payment →'}
      </BookButton>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

// Address field with Mapbox geocoding autocomplete — very accurate for Calgary
function AddressField({ label, value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const fetchSuggestions = async (query) => {
    if (query.length < 2 || !token) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      // Mapbox geocoding API — biased to Calgary, Alberta, Canada
      // Include address + poi (points of interest like apartment buildings) for max accuracy
      const proximity = '-114.0719,51.0447'; // Calgary center
      const bbox = '-114.3,50.9,-113.9,51.2'; // Calgary bounding box
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${token}&country=ca&proximity=${proximity}&bbox=${bbox}&types=address,poi,neighborhood&limit=6&autocomplete=true`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val) => {
    onChange(val); // pass just the string while typing
    setShowDropdown(true);
    setHighlighted(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const selectSuggestion = (s) => {
    // Pass the full feature back so parent can extract postal code, coords, etc.
    onChange(s.place_name, s);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <label className="block relative">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value.length >= 2 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none"
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-72 overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Searching addresses...
            </div>
          )}
          {suggestions.map((s, i) => {
            // Mapbox returns place_name as "123 5 Ave NE, Calgary, Alberta T2E 8N6, Canada"
            // Split into main address + area for display
            const parts = (s.place_name || '').split(',');
            const mainAddr = parts[0] || s.place_name;
            const area = parts.slice(1).join(',').trim();
            return (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-all ${
                  highlighted === i ? 'bg-orange-50' : 'hover:bg-orange-50'
                } ${i === 0 ? 'rounded-t-2xl' : ''} ${i === suggestions.length - 1 ? 'rounded-b-2xl' : ''}`}
              >
                <div className="text-sm font-semibold text-gray-900">{mainAddr}</div>
                {area && <div className="text-xs text-gray-500 mt-0.5">{area}</div>}
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}
