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
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { calculatePrice, PRICING, LOAD_LABELS } from '@/lib/pricingConstants';
import { buildItemizedQuote, recalcWithDisposal } from '@/lib/itemPricing';
import AddItemPicker from '@/components/booking/AddItemPicker';

const LOADS = [
  { key: 'single_item', title: '1–2 items', desc: 'Couch, mattress, single appliance', price: 99 },
  { key: 'quarter', title: 'Small load', desc: 'A few items + boxes', price: 160 },
  { key: 'half', title: 'Half load', desc: 'Half a 15ft truck', price: 240 },
  { key: 'full', title: 'Full load', desc: 'Garage / estate cleanout', price: 380 },
];

const STEPS = ['phone', 'address', 'photos', 'items', 'load', 'schedule', 'details', 'payment', 'done'];

const todayEdmonton = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
};

// Check if a Mapbox address feature is within Calgary service area.
// Calgary bounding box: roughly -114.3 to -113.8 longitude, 50.85 to 51.25 latitude.
// We also check the city/region context from Mapbox for a more reliable match.
const isInCalgary = (data) => {
  if (!data) return true; // manual entry — assume in area, let them proceed

  // Check coords against Calgary bounding box (generous to include outskirts)
  if (data.center) {
    const [lng, lat] = data.center;
    if (lng >= -114.5 && lng <= -113.8 && lat >= 50.85 && lat <= 51.25) {
      return true;
    }
  }

  // Check context for Calgary place name
  const contextText = (data.context || []).map((c) => (c.text || '').toLowerCase()).join(' ');
  const placeName = (data.place_name || '').toLowerCase();
  const fullText = contextText + ' ' + placeName;

  if (fullText.includes('calgary')) return true;

  // Check if region is Alberta and place is Calgary
  const place = (data.context || []).find((c) => c.id?.startsWith('place'));
  if (place && place.text?.toLowerCase() === 'calgary') return true;

  return false;
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
    typeof window !== 'undefined' && localStorage.getItem('jh_phone') ? 'address' : 'phone'
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
    customer_notes: '', // notes from customer about pickup
    referral_code: '', // referral code/phone for double-sided reward
    itemized: null, // itemized quote from photo analysis
    is_custom_slot: false, // custom slot selected by customer
    out_of_area: false, // address is outside Calgary service area
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
            {STEPS.slice(1, 8).map((s, i) => (
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
              state={state}
              update={update}
              onNext={(phone) => {
                setCapturedPhone(phone);
                setStep('address');
              }}
            />
          )}
          {step === 'address' && (
            <AddressStep
              state={state}
              update={update}
              sessionId={sessionId}
              onNext={() => setStep('photos')}
            />
          )}
          {step === 'photos' && (
            <PhotoStep
              state={state}
              update={update}
              capturedPhone={capturedPhone}
              sessionId={sessionId}
              onNext={() => setStep(state.itemized ? 'items' : 'load')}
            />
          )}
          {step === 'items' && (
            <ItemsStep
              state={state}
              update={update}
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
// STEP 0 — PHONE ONLY
// ============================================================
function PhoneStep({ sessionId, state, update, onNext }) {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const rawPhone = phone.replace(/\D/g, '');
  const phoneValid = rawPhone.length === 10;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const phoneToSend = `+1${rawPhone}`;
    try {
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const utm = {
        utm_source: urlParams.get('utm_source') || null,
        utm_medium: urlParams.get('utm_medium') || null,
        utm_campaign: urlParams.get('utm_campaign') || null,
        gclid: urlParams.get('gclid') || null,
        fbclid: urlParams.get('fbclid') || null,
      };
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToSend, session_id: sessionId, action: 'init', source: 'web', ...utm }),
      });
      if (!res.ok) throw new Error('Failed');
      localStorage.setItem('jh_phone', phoneToSend);
      update({ phone: phoneToSend });
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
        <p className="mt-2 text-gray-500 text-sm">Enter your mobile number and we&apos;ll text you your quote. No spam, ever.</p>
      </div>

      <input
        type="tel"
        inputMode="numeric"
        placeholder="(587) 000-0000"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && phoneValid && submit()}
        className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-lg font-medium"
        autoFocus
      />
      <div className="-mt-3">
        <span className="text-xs font-medium text-gray-700">Mobile number</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <BookButton disabled={!phoneValid || submitting} onClick={submit}>
        {submitting ? 'One sec…' : 'Continue →'}
      </BookButton>
      <p className="text-center text-xs text-gray-400">
        By continuing you agree to receive texts about your booking. Standard rates may apply.
      </p>
    </div>
  );
}

// ============================================================
// STEP 1 — ADDRESS (with Mapbox autocomplete)
// ============================================================
function AddressStep({ state, update, sessionId, onNext }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const addressValid = state.address.trim().length >= 5;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (state.out_of_area) {
        await fetch('/api/capture-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: state.phone,
            session_id: sessionId,
            action: 'out_of_area',
            address: state.address,
            address_data: state.address_data,
          }),
        }).catch(() => {});
        setSubmitting(false);
        return;
      }
      onNext();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Where are we picking up?</h2>
        <p className="mt-2 text-gray-500 text-sm">Start typing your Calgary address and select it from the dropdown.</p>
      </div>

      <div>
        <span className="text-sm font-medium text-gray-700">Pickup address</span>
        <div className="mt-1">
          <AddressAutocomplete
            value={state.address}
            onChange={(v) => update({ address: v, address_data: null, is_apartment: false, out_of_area: false })}
            onSelect={(data) => {
              const inCalgary = isInCalgary(data);
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
                out_of_area: !inCalgary,
                stairs: isApt && !state.stairs_confirmed ? Math.max(state.stairs, 1) : state.stairs,
              });
            }}
            placeholder="123 5 Ave NE, Calgary"
            style={{ minHeight: 48, fontSize: 16 }}
          />
        </div>
      </div>

      {state.out_of_area && (
        <OutOfAreaNotice state={state} sessionId={sessionId} />
      )}

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
      {!state.is_apartment && addressValid && (
        <Field
          label="Unit / buzzer (optional)"
          value={state.unit}
          onChange={(v) => update({ unit: v })}
          placeholder="Apt 204"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <BookButton disabled={!addressValid || submitting} onClick={submit}>
        {submitting ? 'One sec…' : state.out_of_area ? 'Submit my info →' : 'Continue →'}
      </BookButton>
    </div>
  );
}

// ============================================================
// OUT OF AREA NOTICE — shown when address is outside Calgary
// ============================================================
function OutOfAreaNotice({ state, sessionId }) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState(state.email || '');
  const [notes, setNotes] = useState('');

  const submitInfo = async () => {
    setSubmitted(true);
    // Update the lead with email and notes
    fetch('/api/capture-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: state.phone,
        session_id: sessionId,
        action: 'out_of_area',
        name: state.name,
        address: state.address,
        address_data: state.address_data,
        email: email || null,
        notes: notes || null,
      }),
    }).catch(() => {});
  };

  if (submitted) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-blue-900">Thanks, {state.name}!</p>
        <p className="text-sm text-blue-700">
          We&apos;ve saved your info. We currently service Calgary and surrounding areas only,
          but we&apos;re expanding. We&apos;ll reach out as soon as we cover your area.
        </p>
        <p className="text-xs text-blue-500 mt-2">
          Questions? Call or text us at <a href="tel:+15873250751" className="underline font-medium">(587) 325-0751</a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-3">
      <div>
        <p className="font-semibold text-orange-800">
          Unfortunately, we don&apos;t service your area yet.
        </p>
        <p className="text-sm text-orange-700 mt-1">
          We currently operate in Calgary and surrounding areas. But we&apos;re expanding fast —
          leave us your info and we&apos;ll reach out when we cover your area.
        </p>
      </div>

      <Field
        label="Email (optional)"
        value={email}
        onChange={setEmail}
        placeholder="you@email.com"
        type="email"
      />

      <label className="block">
        <span className="text-sm font-medium text-gray-700">What do you need hauled? (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tell us what you've got and we'll keep it on file."
          rows={2}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-orange-500 focus:outline-none resize-none"
        />
      </label>

      <button
        onClick={submitInfo}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl"
      >
        Save my info
      </button>

      <p className="text-xs text-orange-600 text-center">
        We&apos;ll only contact you about servicing your area. No spam.
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
        itemized: data.itemized || null,
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
// STEP 1.5 — ITEMIZED REVIEW (dump vs donate selection)
// ============================================================
function ItemsStep({ state, update, onNext }) {
  const itemized = state.itemized;
  if (!itemized || !itemized.items || itemized.items.length === 0) {
    // No items to review, skip
    return <div><p className="text-gray-500 py-10 text-center">No items detected. Continue to pick your load size.</p><BookButton onClick={onNext}>Continue →</BookButton></div>;
  }

  const items = itemized.items;

  const toggleDisposal = (idx, disposal) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], disposal };
    const recalced = recalcWithDisposal(newItems, {
      stairs: state.stairs,
      same_day: state.same_day,
    });
    update({ itemized: recalced });
  };

  const updateQty = (idx, delta) => {
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      quantity: Math.max(1, newItems[idx].quantity + delta),
      line_total: Math.max(1, newItems[idx].quantity + delta) * newItems[idx].unit_price,
    };
    const recalced = recalcWithDisposal(newItems, {
      stairs: state.stairs,
      same_day: state.same_day,
    });
    update({ itemized: recalced });
  };

  const removeItem = (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    if (newItems.length === 0) {
      update({ itemized: null });
      onNext();
      return;
    }
    const recalced = recalcWithDisposal(newItems, {
      stairs: state.stairs,
      same_day: state.same_day,
    });
    update({ itemized: recalced });
  };

  const dumpTotal = items.filter((i) => i.disposal === 'dump' && !i.is_hazmat).reduce((s, i) => s + i.line_total, 0);
  const donateCount = items.filter((i) => i.disposal === 'donate').length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your items</h2>
        <p className="text-gray-500 text-sm mt-1">
          Here&apos;s what we see. Mark items to <b>donate</b> (free — we drop them at charity) or <b>dump</b>.
        </p>
      </div>

      {/* Hazmat warning */}
      {items.some((i) => i.is_hazmat) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm font-medium text-red-700">Items we cannot take:</p>
          <ul className="text-sm text-red-600 mt-1">
            {items.filter((i) => i.is_hazmat).map((i, idx) => (
              <li key={idx}>• {i.name} — please remove before pickup</li>
            ))}
          </ul>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className={`bg-white rounded-xl border p-3 ${item.is_hazmat ? 'border-red-200 opacity-60' : item.disposal === 'donate' ? 'border-green-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                  {item.is_freon && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Freon</span>}
                  {item.note && <span className="text-[10px] text-gray-400">{item.note}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.disposal === 'donate' ? (
                    <span className="text-green-600 font-medium">Free — donated to charity</span>
                  ) : item.is_hazmat ? (
                    <span className="text-red-600">Cannot take</span>
                  ) : (
                    <span>${item.unit_price} each × {item.quantity} = ${item.line_total}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="text-gray-300 hover:text-red-500 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quantity + disposal toggle */}
            {!item.is_hazmat && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(idx, -1)}
                    className="w-7 h-7 rounded-full border border-gray-300 text-sm"
                  >−</button>
                  <span className="text-sm w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(idx, 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 text-sm"
                  >+</button>
                </div>

                {item.donatable && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleDisposal(idx, 'dump')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        item.disposal === 'dump'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Dump
                    </button>
                    <button
                      onClick={() => toggleDisposal(idx, 'donate')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        item.disposal === 'donate'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Donate (free)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add item */}
      <AddItemPicker onAdd={(newItem) => {
        const newItems = [...items, newItem];
        const recalced = recalcWithDisposal(newItems, {
          stairs: state.stairs,
          same_day: state.same_day,
        });
        update({ itemized: recalced });
      }} />

      {/* Running total */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Items to dump</span>
          <span className="font-medium text-gray-900">${dumpTotal}</span>
        </div>
        {donateCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Items to donate</span>
            <span className="font-medium text-green-600">{donateCount} item{donateCount > 1 ? 's' : ''} — free</span>
          </div>
        )}
        {itemized.is_minimum && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
            <p className="text-sm font-medium text-orange-700">
              Minimum charge is $99 — your items total ${dumpTotal}, so we&apos;ve topped it up to $99.
            </p>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="font-semibold text-gray-900">Your price</span>
          <span className="text-2xl font-bold text-gray-900">${itemized.total}</span>
        </div>
      </div>

      <BookButton onClick={onNext}>Continue →</BookButton>
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

      {/* Add items to donate (works even without photo analysis) */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-green-800">Items to donate</span>
          {state.itemized && state.itemized.items && state.itemized.items.filter((i) => i.disposal === 'donate').length > 0 && (
            <span className="text-xs text-green-600">
              {state.itemized.items.filter((i) => i.disposal === 'donate').length} item(s) marked
            </span>
          )}
        </div>
        <p className="text-xs text-green-600 mb-2">
          Got furniture, clothes, or electronics in good shape? Mark them for donation and we&apos;ll drop them at charity for free.
        </p>
        {state.itemized && state.itemized.items && state.itemized.items.filter((i) => i.disposal === 'donate').length > 0 && (
          <div className="space-y-1 mb-2">
            {state.itemized.items.filter((i) => i.disposal === 'donate').map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
                <span className="text-sm text-gray-700">
                  {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                </span>
                <button
                  onClick={() => {
                    const newItems = state.itemized.items.filter((_, i) => i !== idx);
                    if (newItems.length === 0) {
                      update({ itemized: null });
                    } else {
                      const recalced = recalcWithDisposal(newItems, { stairs: state.stairs, same_day: state.same_day });
                      update({ itemized: recalced });
                    }
                  }}
                  className="text-gray-300 hover:text-red-500 text-sm"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <AddItemPicker
          compact
          onAdd={(newItem) => {
            newItem.disposal = 'donate';
            const existing = state.itemized?.items || [];
            const newItems = [...existing, newItem];
            const recalced = recalcWithDisposal(newItems, { stairs: state.stairs, same_day: state.same_day });
            update({ itemized: recalced });
          }}
        />
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
  const [noStandardSlots, setNoStandardSlots] = useState(false);

  useEffect(() => {
    fetch('/api/slots')
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days || []);
        setNoStandardSlots(data.no_standard_slots || false);
        if (data.days?.length) setActiveDay(data.days[0].date);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = todayEdmonton();
  const day = days.find((d) => d.date === activeDay);

  const pick = (date, time, isCustom = false) => {
    update({
      job_date: date,
      job_time: time,
      same_day: date === today,
      is_custom_slot: isCustom,
    });
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
      <p className="text-gray-500 text-sm -mt-2">
        We run Thursdays and Sundays. All bookings must be at least 24 hours in advance.
      </p>

      {noStandardSlots && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm font-medium text-blue-700">
            Our regular slots are full — pick any available time below and we&apos;ll make it work.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((d) => {
          const dayRemaining = d.slots.reduce((sum, s) => sum + (s.remaining || 0), 0);
          const isLow = dayRemaining <= 3 && dayRemaining > 0;
          return (
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
              {isLow && (
                <span className={`ml-1.5 text-xs ${activeDay === d.date ? 'text-orange-300' : 'text-orange-600'}`}>
                  · {dayRemaining} left
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {day?.slots.map((s) => {
          const remaining = s.remaining || 0;
          const isScarce = remaining <= 2;
          return (
            <div key={s.time} className="relative">
              <SlotPill
                time={s.label}
                available
                sameDay={activeDay === today}
                selected={state.job_date === activeDay && state.job_time === s.time}
                onClick={() => pick(activeDay, s.time, day?.is_custom)}
              />
              {isScarce && !day?.is_custom && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {remaining} left
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Scarcity messaging */}
      {day && !day?.is_custom && (() => {
        const totalRemaining = day.slots.reduce((sum, s) => sum + (s.remaining || 0), 0);
        if (totalRemaining <= 2) {
          return (
            <p className="text-xs text-orange-600 font-medium">
              ⚡ Only {totalRemaining} slot{totalRemaining === 1 ? '' : 's'} left this day — book before they&apos;re gone!
            </p>
          );
        }
        if (totalRemaining <= 4) {
          return (
            <p className="text-xs text-orange-500">
              Limited availability — {totalRemaining} slots remaining.
            </p>
          );
        }
        return null;
      })()}

      <BookButton disabled={!state.job_time} onClick={onNext}>
        Continue →
      </BookButton>
    </div>
  );
}

// ============================================================
// STEP 4 — EMAIL (optional) + CREATE BOOKING
// ============================================================
function DetailsStep({ state, update, price, onCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const nameValid = state.name.trim().length >= 2;
  const valid = nameValid && state.phone && state.address;

  const submit = async () => {
    if (!nameValid) {
      setError('Please enter your full name.');
      return;
    }

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
          customer_notes: state.customer_notes || null,
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
          referral_code: state.referral_code || null,
          is_custom_slot: state.is_custom_slot || false,
          itemized_items: state.itemized?.items || null,
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

  // Use itemized total if available, otherwise standard price
  const displayTotal = state.itemized ? state.itemized.total : price.total;
  const displayBalance = state.itemized ? state.itemized.balance_due : price.balance_due;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-gray-900">Your quote is ready</h2>

      {/* Itemized breakdown if available */}
      {state.itemized && state.itemized.items && state.itemized.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Itemized breakdown</h3>
          {state.itemized.items.filter((i) => i.disposal === 'dump' && !i.is_hazmat).map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
              </span>
              <span className="font-medium text-gray-900">${item.line_total}</span>
            </div>
          ))}
          {state.itemized.items.some((i) => i.disposal === 'donate') && (
            <div className="flex justify-between text-sm pt-1">
              <span className="text-green-600">Donated items (free)</span>
              <span className="text-green-600 font-medium">
                {state.itemized.items.filter((i) => i.disposal === 'donate').length} item(s)
              </span>
            </div>
          )}
          {state.itemized.is_minimum && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
              <p className="text-sm font-medium text-orange-700">
                Minimum charge is $99 — topped up from ${state.itemized.subtotal + state.itemized.stairs_fee + state.itemized.same_day_fee}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quote summary */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Load size</span>
          <span className="font-medium text-gray-900">{LOAD_LABELS[state.load_size]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Pickup date</span>
          <span className="font-medium text-gray-900">{state.job_date}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Pickup time</span>
          <span className="font-medium text-gray-900">{state.job_time}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Pickup address</span>
          <span className="font-medium text-gray-900 text-right text-xs max-w-[60%] truncate">{state.address}</span>
        </div>
        {price.freon_fee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Freon ({state.freon_count} item{state.freon_count > 1 ? 's' : ''})</span>
            <span className="font-medium text-gray-900">${price.freon_fee}</span>
          </div>
        )}
        {price.stairs_fee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Stairs ({state.stairs} flight{state.stairs > 1 ? 's' : ''})</span>
            <span className="font-medium text-gray-900">${price.stairs_fee}</span>
          </div>
        )}
        {price.same_day_fee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Same-day</span>
            <span className="font-medium text-gray-900">${price.same_day_fee}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-gray-900">${displayTotal}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Deposit today</span>
          <span className="font-medium text-gray-700">$50</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Balance on pickup</span>
          <span className="font-medium text-gray-700">${displayBalance}</span>
        </div>
      </div>

      {/* Name + email collected here, right before payment */}
      <Field
        label="Full name"
        value={state.name}
        onChange={(v) => update({ name: v })}
        placeholder="Jane Doe"
      />

      <Field
        label="Email (optional — for your receipt)"
        value={state.email}
        onChange={(v) => update({ email: v })}
        placeholder="you@email.com"
        type="email"
      />

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Notes for our team (optional)</span>
        <textarea
          value={state.customer_notes}
          onChange={(e) => update({ customer_notes: e.target.value })}
          placeholder="Any details about the junk, access, parking, gate codes, heavy items, etc."
          rows={3}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-orange-500 focus:outline-none resize-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
