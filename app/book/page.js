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
import { calculatePrice, PRICING, LOAD_LABELS, TRUCK_SIZES, TRUCK_SIZE_WEIGHT_THRESHOLDS } from '@/lib/pricingConstants';
import { buildItemizedQuote, recalcWithDisposal } from '@/lib/itemPricing';
import AddItemPicker from '@/components/booking/AddItemPicker';

const LOADS = [
  { key: 'single_item', title: '1–2 items', desc: 'Couch, mattress, single appliance', price: 99 },
  { key: 'quarter', title: 'Small load', desc: 'A few items + boxes', price: 160 },
  { key: 'half', title: 'Half load', desc: 'Half a 15ft truck', price: 240 },
  { key: 'full', title: 'Full load', desc: 'Garage / estate cleanout', price: 380 },
];

const STEPS_BASE = ['phone', 'address', 'photos', 'review', 'schedule', 'details', 'payment', 'done'];
const STEPS_PRICE_FIRST = ['address', 'photos', 'review', 'phone', 'schedule', 'details', 'payment', 'done'];

const STORAGE_KEY = 'jh_booking_state';

// '15:00' -> '3:00 PM' (client-side version of lib/dates formatTime)
const formatTimeDisplay = (time24) => {
  const [h, m] = time24.split(':').map((x) => parseInt(x, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

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
  const [phoneGatePosition, setPhoneGatePosition] = useState('phone_first');
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
    truck_size: 15,
    job_date: null,
    job_time: null,
    job_window_label: null,
    job_window_start: null,
    job_window_end: null,
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

  // Step order is config-driven (A/B test: phone gate first vs price first).
  const STEPS = phoneGatePosition === 'price_first' ? STEPS_PRICE_FIRST : STEPS_BASE;
  const stepIndex = STEPS.indexOf(step);

  // Map of current step -> next step, depends on the variant.
  const nextStepMap = phoneGatePosition === 'price_first'
    ? { address: 'photos', photos: 'review', review: 'phone', phone: 'schedule', schedule: 'details', details: 'payment' }
    : { phone: 'address', address: 'photos', photos: 'review', review: 'schedule', schedule: 'details', details: 'payment' };
  const getNextStep = (current) => nextStepMap[current] || 'done';

  // Rehydrate booking state from localStorage on mount so a refresh /
  // background-tab switch during AI photo analysis doesn't lose progress.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't restore photos as blobs — they can't be serialized.
        // But restore everything else.
        //
        // Gating on parsed.phone alone (audit B13) meant the price_first
        // variant (STEPS_PRICE_FIRST: address -> photos -> review -> phone
        // -> ...) never restored anything, since phone isn't captured
        // until step 4 -- a refresh during AI photo analysis, exactly the
        // case this restore exists for per the comment above, silently
        // wiped all progress for that variant. address is the earliest
        // field either variant sets (phone_first's first step, price_first's
        // very first step), so check both.
        if (parsed.phone || parsed.address) {
          setState((s) => ({ ...s, ...parsed, photos: s.photos }));
        }
      }
    } catch (e) { /* silent */ }
  }, []);

  // Persist to localStorage whenever state changes (except photos which are
  // base64 strings / File objects that bloat storage).
  useEffect(() => {
    try {
      const { photos, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch (e) { /* silent — quota or serialization */ }
  }, [state]);

  // Fetch the phone-gate position (A/B variant) from config on mount. This
  // is config-driven (not random): the operator sets
  // booking_phone_gate_position to 'phone_first' (default) or 'price_first'.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/config/booking-flow')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const pos = data?.phone_gate_position === 'price_first' ? 'price_first' : 'phone_first';
        setPhoneGatePosition(pos);
        // For the price_first variant, the first step is 'address' (no phone
        // gate up front). If we defaulted to 'phone' and the user hasn't
        // captured a phone yet, jump them to 'address'.
        if (pos === 'price_first' && !capturedPhone) {
          setStep((s) => (s === 'phone' ? 'address' : s));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Funnel tracking — fire a lightweight capture-lead update on every
  // step change so we know where each lead dropped off. Works with
  // session_id alone so the price_first variant can track steps before the
  // phone is captured (phone is sent as 'pending' in that case).
  const goToStep = (nextStep) => {
    setStep(nextStep);
    if (sessionId) {
      fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: capturedPhone || 'pending',
          session_id: sessionId,
          action: 'step',
          step_name: nextStep,
          ab_variant: phoneGatePosition,
        }),
      }).catch(() => {});
    }
  };

  const price = calculatePrice({
    load_size: state.load_size,
    same_day: state.same_day,
    stairs: state.stairs,
    has_freon: state.has_freon,
    freon_count: state.freon_count,
    truck_size: state.truck_size || 15,
    job_date: state.job_date,
    job_time: state.job_time,
  });

  return (
    <>
      <style>{`
        body { background: #F5F5F7; }
        @media (max-width: 480px) { body { background: #fff; } }
      `}</style>
      <main
        className="min-h-dvh flex flex-col px-6 py-5 mx-auto"
        style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#fff' }}
      >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Logo className="h-7" showWordmark={false} />
        </Link>
        {step !== 'done' && (
          <div className="flex gap-1">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full ${
                  i + 1 <= stepIndex ? 'bg-orange-500' : 'bg-gray-200'
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
              variant={phoneGatePosition}
              onNext={(phone) => {
                setCapturedPhone(phone);
                goToStep(getNextStep('phone'));
              }}
            />
          )}
          {step === 'address' && (
            <AddressStep
              state={state}
              update={update}
              sessionId={sessionId}
              variant={phoneGatePosition}
              onNext={() => goToStep(getNextStep('address'))}
            />
          )}
          {step === 'photos' && (
            <PhotoStep
              state={state}
              update={update}
              capturedPhone={capturedPhone}
              sessionId={sessionId}
              variant={phoneGatePosition}
              onNext={() => goToStep(getNextStep('photos'))}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              state={state}
              update={update}
              price={price}
              onNext={() => goToStep(getNextStep('review'))}
            />
          )}
          {step === 'schedule' && (
            <ScheduleStep
              state={state}
              update={update}
              onNext={() => goToStep(getNextStep('schedule'))}
            />
          )}
          {step === 'details' && (
            <DetailsStep
              state={state}
              update={update}
              price={price}
              sessionId={sessionId}
              onCreated={(b) => {
                setBooking(b);
                goToStep(getNextStep('details'));
                if (capturedPhone) {
                  fetch('/api/capture-lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: capturedPhone, session_id: sessionId, action: 'convert', booking_id: b.id }),
                  }).catch(() => {});
                  localStorage.removeItem('jh_session');
                  localStorage.removeItem('jh_phone');
                  localStorage.removeItem(STORAGE_KEY);
                }
              }}
            />
          )}
          {step === 'payment' && booking && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Confirm & pay</h2>
              <p className="text-gray-500 text-sm mb-5">
                Just a ${booking.total - booking.balance_due} deposit today, the rest on pickup day.
              </p>
              <PaymentStep
                clientSecret={booking.client_secret}
                total={booking.total}
                balance_due={booking.balance_due}
                breakdown={booking.breakdown}
                onPaid={() => {
                  setBooking((b) => ({
                    ...b,
                    job_date: state.job_date,
                    job_time: state.job_time,
                    address: state.unit ? `${state.unit}-${state.address}` : state.address,
                    phone: state.phone,
                  }));
                  goToStep(getNextStep('payment'));
                }}
              />
            </div>
          )}
          {step === 'done' && booking && <Confirmation booking={booking} />}
        </motion.div>
      </AnimatePresence>

      {/* Persistent running-price footer — shows on every step after the
          review step so the customer always sees their price. */}
      {state.load_size && stepIndex > STEPS.indexOf('review') && step !== 'done' && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: '#fff',
            borderTop: '1px solid rgba(0,0,0,.06)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>
            {booking ? 'Your price' : 'Estimated price'}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>
            {/* Once a booking exists, this is the real server-computed
                total (audit B1) -- the client's flat-rate/itemized
                estimate above is never what gets charged. */}
            ${booking ? booking.total : (state.itemized ? state.itemized.total : price.total)}
          </span>
        </div>
      )}
      </main>
    </>
  );
}


// ============================================================
// STEP 0 — PHONE ONLY
// ============================================================
function PhoneStep({ sessionId, state, update, variant, onNext }) {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isPriceFirst = variant === 'price_first';

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
        body: JSON.stringify({ phone: phoneToSend, session_id: sessionId, action: 'init', source: 'web', ab_variant: variant, ...utm }),
      });
      if (!res.ok) throw new Error('Failed');
      localStorage.setItem('jh_phone', phoneToSend);
      update({ phone: phoneToSend });
      // Fire a non-blocking SMS OTP verification — silent, never blocks progress.
      fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToSend }),
      }).catch(() => { /* silent — non-blocking */ });
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
        <h2 className="text-2xl font-bold text-gray-900">
          {isPriceFirst ? 'Almost there — what\u2019s your number?' : 'Get your instant price'}
        </h2>
        <p className="mt-2 text-gray-500 text-sm">
          {isPriceFirst
            ? 'Last step before booking — we\u2019ll text you a confirmation. No spam, ever.'
            : 'Enter your mobile number and we\u2019ll text you your quote. No spam, ever.'}
        </p>
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
      <p className="text-center text-xs text-gray-400">
        Prefer to just chat? <a href="/book/chat" className="text-orange-600 underline">Book with our AI assistant</a> instead.
      </p>
    </div>
  );
}

// ============================================================
// STEP 1 — ADDRESS (with Mapbox autocomplete)
// ============================================================
function AddressStep({ state, update, sessionId, variant, onNext }) {
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
            phone: state.phone || 'pending',
            session_id: sessionId,
            action: 'out_of_area',
            address: state.address,
            address_data: state.address_data,
            ab_variant: variant,
          }),
        }).catch(() => {});
        setSubmitting(false);
        return;
      }
      // Save the address on the lead for in-area customers too,
      // so we have it even if they don't finish the booking.
      if (state.phone) {
        fetch('/api/capture-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: state.phone,
            session_id: sessionId,
            action: 'update',
            address: state.address,
            address_data: state.address_data,
            ab_variant: variant,
          }),
        }).catch(() => {});
      } else {
        // price_first variant: no phone yet, so create the lead row now
        // (with phone='pending') so step tracking + price reveal have a row
        // to update. The address is attached here; the real phone is filled
        // in later at the phone step (a second 'init' upserts by session_id).
        const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        fetch('/api/capture-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: 'pending',
            session_id: sessionId,
            action: 'init',
            source: 'web',
            address: state.address,
            address_data: state.address_data,
            ab_variant: variant,
            utm_source: urlParams.get('utm_source') || null,
            utm_medium: urlParams.get('utm_medium') || null,
            utm_campaign: urlParams.get('utm_campaign') || null,
            gclid: urlParams.get('gclid') || null,
            fbclid: urlParams.get('fbclid') || null,
          }),
        }).catch(() => {});
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
function PhotoStep({ state, update, capturedPhone, sessionId, variant, onNext }) {
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
      // Photo path: send all photos in ONE request to /api/photo-quote
      // (multi-image support). Description path still uses /api/analyze.
      let data;
      if (photos) {
        const res = await fetch('/api/photo-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: photos.map((p) => ({ imageBase64: p })) }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
      } else {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
      }

      // Photo unusable (e.g. intimate content accidentally in frame) — ask the
      // customer to retake. Never describe why. No analysis is returned.
      if (data.photo_unusable) {
        setError('Photo unusable — please retake your photo and try again.');
        setAnalyzing(false);
        return;
      }

      update({
        analysis: data.analysis,
        load_size: data.analysis.load_size,
        has_freon: data.analysis.has_freon || false,
        freon_count: data.analysis.freon_count || (data.analysis.has_freon ? 1 : 0),
        photoUrls: data.photoUrls || [],
        photo_skipped: false,
        itemized: data.itemized || null,
        truck_size: data.analysis.recommended_truck_size || 15,
        possible_cross_photo_duplicates: data.analysis.possible_cross_photo_duplicates || [],
        photo_quote_tier: data.analysis.photo_quote_tier || null,
      });
      if (sessionId && data.analysis) {
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
            phone: capturedPhone || 'pending',
            session_id: sessionId,
            action: 'price_reveal',
            ai_price_estimate: priceEstimate.total,
            load_size: data.analysis.load_size,
            photos: data.photoUrls || [],
            itemized: data.itemized || null,
            ab_variant: variant,
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
// STEP 2 — REVIEW & CUSTOMIZE (merged items + load + add-ons)
// ============================================================
function ReviewStep({ state, update, price, onNext }) {
  const itemized = state.itemized;
  const hasItems = itemized && itemized.items && itemized.items.length > 0;
  const items = hasItems ? itemized.items : [];

  // ---- ItemsStep handlers (dump/donate, qty, remove) ----
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

  // ---- LoadStep computed values ----
  // Truck size upsell trigger: show when full load is selected OR
  // AI weight/volume exceeds the 15ft capacity.
  const aiWeightLbs = state.analysis?.estimated_weight_kg
    ? Math.round(state.analysis.estimated_weight_kg * 2.20462)
    : (state.analysis?.estimated_weight_lbs || 0);
  const aiVolumeCuft = state.analysis?.estimated_volume_cuft || 0;
  const recommendedTruck = state.analysis?.recommended_truck_size || 15;
  const showTruckUpsell =
    state.load_size === 'full' ||
    recommendedTruck > 15 ||
    aiWeightLbs >= TRUCK_SIZE_WEIGHT_THRESHOLDS.recommend_20ft_lbs;

  // Flat-rate comparison: calculate the flat-rate total for the AI-suggested
  // load size + the truck size that can actually handle the volume/weight.
  // Don't suggest a flat-rate that physically won't fit in the truck.
  const flatRateTruckSize = hasItems ? (state.analysis?.recommended_truck_size || state.truck_size || 15) : 15;
  const flatRateTotal = hasItems ? (() => {
    const flatPrice = calculatePrice({
      load_size: state.analysis?.load_size || state.load_size,
      same_day: state.same_day,
      stairs: state.stairs,
      has_freon: state.freon_count > 0,
      freon_count: state.freon_count,
      truck_size: flatRateTruckSize,
    });
    return flatPrice.total;
  })() : 0;

  const itemizedTotal = hasItems ? itemized.total : 0;
  const flatRateCheaper = hasItems && flatRateTotal > 0 && flatRateTotal < itemizedTotal;
  const savingsAmount = flatRateCheaper ? itemizedTotal - flatRateTotal : 0;

  // Auto-suggest a truck size based on AI weight + volume (customer can override).
  // Prefer the server-side recommendation (which checks both volume AND weight
  // against actual truck capacities), fall back to the weight-only heuristic.
  const suggestedTruckSize = recommendedTruck > 15
    ? recommendedTruck
    : aiWeightLbs >= TRUCK_SIZE_WEIGHT_THRESHOLDS.recommend_26ft_lbs
    ? 26
    : aiWeightLbs >= TRUCK_SIZE_WEIGHT_THRESHOLDS.recommend_20ft_lbs
    ? 20
    : 15;

  // Build a weight lookup from AI detection so we can show kg as secondary text on priced items
  const aiWeightByName = {};
  if (state.analysis?.items_detected) {
    for (const d of state.analysis.items_detected) {
      if (d.estimated_weight_kg) aiWeightByName[d.name?.toLowerCase()] = d.estimated_weight_kg;
    }
  }

  // Hazmat items from the priced list — these are the specific, distinguishable items
  const hazmatItems = items.filter((i) => i.is_hazmat);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review &amp; customize</h2>
        {state.analysis && (
          <p className="text-gray-500 text-sm mt-1">
            We estimated <b>{LOAD_LABELS[state.analysis.load_size]}</b>
            {state.analysis.confidence ? ` (${state.analysis.confidence} confidence)` : ''}.
            Adjust your items and add-ons below.
          </p>
        )}
        {!state.analysis && (
          <p className="text-gray-500 text-sm mt-1">
            Pick your load size and add any extras below.
          </p>
        )}
      </div>

      {/* ===== SECTION: YOUR ITEMS (priced, interactive — the single source of truth) ===== */}
      {hasItems && (
        <>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Your items</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Single hazmat warning — points at specific named items */}
          {hazmatItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm font-medium text-red-700">We can&apos;t take these — please remove before pickup:</p>
              <ul className="text-sm text-red-600 mt-1 space-y-0.5">
                {hazmatItems.map((i, idx) => (
                  <li key={idx}>• {i.name}{i.quantity > 1 ? ` (${i.quantity}x)` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Item list — single inventory, priced, interactive */}
          <div className="space-y-2">
            {items.map((item, idx) => {
              const weightKg = aiWeightByName[item.name?.toLowerCase()];
              return (
                <div key={idx} className={`bg-white rounded-xl border p-3 ${item.is_hazmat ? 'border-red-200 opacity-60' : item.disposal === 'donate' ? 'border-green-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                        {item.is_freon && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Freon</span>}
                        {weightKg && <span className="text-[10px] text-gray-400">~{weightKg}kg</span>}
                        {item.note && !item.is_hazmat && <span className="text-[10px] text-gray-400">{item.note}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.disposal === 'donate' ? (
                          <span className="text-green-600 font-medium">Free — donated to charity</span>
                        ) : item.is_hazmat ? (
                          <span className="text-red-600 font-medium">
                            Cannot take{item.note ? ` — ${item.note}` : ''}
                          </span>
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
              );
            })}
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

          {/* Item subtotal breakdown — no duplicate "Your price" here */}
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
          </div>
        </>
      )}

      {/* ===== SECTION: FLAT-RATE PRICING (optional alternative when items exist) ===== */}
      {hasItems ? (
        <div className="mt-1">
          {flatRateCheaper ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-green-800">Flat rate could save you an estimated ${savingsAmount}</span>
                  <p className="text-xs text-green-600 mt-0.5">
                    {LOAD_LABELS[state.analysis?.load_size || state.load_size]}
                    {flatRateTruckSize > 15 && ` + ${TRUCK_SIZES[flatRateTruckSize]?.label} truck`}
                    {' '}at ${flatRateTotal} vs itemized at ${itemizedTotal} (both estimates — confirmed at checkout)
                  </p>
                  {flatRateTruckSize > 15 && (
                    <p className="text-[11px] text-green-600 mt-0.5">
                      {aiVolumeCuft > TRUCK_SIZES[15].volume_cuft
                        ? `Your load is ~${Math.round(aiVolumeCuft)} cu ft — won't fit in the 15ft (${TRUCK_SIZES[15].volume_cuft} cu ft), so the ${TRUCK_SIZES[flatRateTruckSize]?.label} is included.`
                        : aiWeightLbs > TRUCK_SIZES[15].max_load_lbs
                          ? `Your load is ~${aiWeightLbs} lbs — too heavy for the 15ft (${TRUCK_SIZES[15].max_load_lbs} lbs max), so the ${TRUCK_SIZES[flatRateTruckSize]?.label} is included.`
                          : null}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    update({
                      load_size: state.analysis?.load_size || state.load_size,
                      truck_size: flatRateTruckSize,
                      itemized: null,
                    });
                  }}
                  className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white font-medium whitespace-nowrap"
                >
                  Apply flat rate
                </button>
              </div>
            </div>
          ) : null}
          <details>
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 font-medium select-none">
              {flatRateCheaper ? 'Compare flat-rate pricing' : 'Prefer flat-rate pricing instead?'}
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {LOADS.map((l) => (
                <LoadCard
                  key={l.key}
                  selected={state.load_size === l.key}
                  onClick={() => {
                    // Switching to flat-rate: clear itemized pricing
                    update({ load_size: l.key, itemized: null });
                  }}
                >
                  <div className="font-semibold text-gray-900">{l.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 h-8">{l.desc}</div>
                  <div className="font-bold text-orange-500 mt-1">${l.price}</div>
                </LoadCard>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Load size</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
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
        </>
      )}

      {/* ===== TRUCK SIZE — always accessible via toggle ===== */}
      {(showTruckUpsell || state.show_truck_size) ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900">Truck size</span>
              {suggestedTruckSize > 15 && (
                <span className="text-xs text-orange-600 ml-2">
                  We recommend {TRUCK_SIZES[suggestedTruckSize].label} based on your load
                </span>
              )}
            </div>
            <button
              onClick={() => update({ show_truck_size: false })}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Hide
            </button>
          </div>
          {aiVolumeCuft > 0 && (
            <div className="text-xs text-gray-500">
              Your load: ~{Math.round(aiVolumeCuft)} cu ft
              {aiWeightLbs > 0 && `, ~${aiWeightLbs} lbs`}
              {' '}— needs to fit in the truck.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[15, 20, 26].map((size) => {
              const fits = aiVolumeCuft <= TRUCK_SIZES[size].volume_cuft && aiWeightLbs <= TRUCK_SIZES[size].max_load_lbs;
              const tooSmall = (aiVolumeCuft > 0 || aiWeightLbs > 0) && !fits;
              return (
                <button
                  key={size}
                  onClick={() => update({ truck_size: size })}
                  className={`rounded-lg p-2 text-center border-2 transition-colors relative ${
                    (state.truck_size || 15) === size
                      ? 'border-orange-500 bg-white'
                      : tooSmall
                        ? 'border-gray-200 bg-gray-50 opacity-60 hover:border-orange-300'
                        : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="text-sm font-bold text-gray-900">{TRUCK_SIZES[size].label}</div>
                  <div className="text-[10px] text-gray-500">{TRUCK_SIZES[size].volume_cuft} cu ft</div>
                  <div className="text-[10px] text-gray-400">{TRUCK_SIZES[size].max_load_lbs.toLocaleString()} lbs</div>
                  <div className="text-xs font-medium text-orange-600 mt-0.5">
                    {TRUCK_SIZES[size].fee === 0 ? 'Included' : `+$${TRUCK_SIZES[size].fee}`}
                  </div>
                  {tooSmall && (
                    <div className="text-[9px] text-red-500 font-medium mt-0.5">Too small</div>
                  )}
                </button>
              );
            })}
          </div>
          {suggestedTruckSize === 26 && aiWeightLbs > TRUCK_SIZES[20].max_load_lbs && (
            <p className="text-xs text-gray-500">
              Your load is heavy enough ({aiWeightLbs} lbs) that the 20ft won&apos;t help (it carries less weight than the 15ft). The 26ft is the right choice.
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => update({ show_truck_size: true })}
          className="text-sm text-gray-400 hover:text-gray-600 font-medium text-left"
        >
          See truck size options →
        </button>
      )}

      {/* ===== DONATE SECTION (from LoadStep) — only when no itemized items ===== */}
      {!hasItems && (
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
              {state.itemized.items.filter((i) => i.disposal === 'donate').map((item) => {
                const realIdx = state.itemized.items.indexOf(item);
                return (
                <div key={realIdx} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5">
                  <span className="text-sm text-gray-700">
                    {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                  </span>
                  <button
                    onClick={() => {
                      const newItems = state.itemized.items.filter((_, i) => i !== realIdx);
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
                );
              })}
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
      )}

      {/* ===== SECTION: ADD-ONS ===== */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Add-ons</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="space-y-3">
        {/* Freon: per-item count — only for flat-rate pricing.
            When using itemized pricing, freon disposal is already
            included in the item's line price (e.g. fridge $65). */}
        {!hasItems && (
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
        )}
        {hasItems && items.some((i) => i.is_freon) && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
            Freon disposal is included in your appliance item prices — no extra charge.
          </div>
        )}

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

      {/* ===== SECTION: ESTIMATED PRICE (client-side estimate — the
          real total is computed server-side from live cost data when
          you submit; see B1 audit note above the price on the next
          screen) ===== */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Estimated price</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold text-gray-900">
              $<AnimatedPrice price={hasItems ? itemized.total : price.total} />
            </span>
            <span className="text-sm text-gray-400 ml-2">estimated</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Deposit today</div>
            <div className="text-sm font-semibold text-gray-700">$50</div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-200 pt-2">
          {hasItems ? (
            <>
              <div className="flex justify-between"><span>Itemized quote ({items.length} item{items.length > 1 ? 's' : ''})</span><span>${itemized.subtotal || itemized.total}</span></div>
              {itemized.is_minimum && <div className="flex justify-between"><span>Minimum charge adjustment</span><span>+$99</span></div>}
              {itemized.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({state.stairs} flight{state.stairs > 1 ? 's' : ''})</span><span>${itemized.stairs_fee}</span></div>}
              {itemized.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${itemized.same_day_fee}</span></div>}
            </>
          ) : (
            <div className="flex justify-between"><span>Base ({LOAD_LABELS[state.load_size]})</span><span>${price.base_price}</span></div>
          )}
          {/* Freon fee only shows for flat-rate pricing — for itemized, it's in the item prices */}
          {!hasItems && price.freon_fee > 0 && (
            <div className="flex justify-between">
              <span>
                Freon ({state.freon_count} item{state.freon_count > 1 ? 's' : ''})
                {state.analysis?.freon_evacuation_claimed && (
                  <span className="block text-xs text-gray-400">
                    We spotted what may be an evacuation sticker — fee still applies until our team verifies it, then we&apos;ll credit it back if confirmed.
                  </span>
                )}
              </span>
              <span>${price.freon_fee}</span>
            </div>
          )}
          {/* Stairs fee for flat-rate */}
          {!hasItems && price.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({state.stairs} flight{state.stairs > 1 ? 's' : ''})</span><span>${price.stairs_fee}</span></div>}
          {/* Same-day for flat-rate */}
          {!hasItems && price.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${price.same_day_fee}</span></div>}
          {price.truck_fee > 0 && <div className="flex justify-between"><span>Larger truck ({TRUCK_SIZES[state.truck_size || 15]?.label})</span><span>+${price.truck_fee}</span></div>}
          <div className="flex justify-between font-medium text-gray-600 pt-1 border-t border-gray-200"><span>Balance on pickup</span><span>${hasItems ? itemized.balance_due : price.balance_due}</span></div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          This is an estimate. Your final price is confirmed on the next screen before you pay a deposit.
        </p>
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
    // Pass load_size + address so the API can run the landfill
    // closing feasibility check per window.
    const params = new URLSearchParams();
    if (state.load_size) params.set('load_size', state.load_size);
    if (state.address) params.set('address', state.address);
    const qs = params.toString();
    fetch(`/api/slots${qs ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days || []);
        setNoStandardSlots(data.no_standard_slots || false);
        if (data.days?.length) setActiveDay(data.days[0].date);
      })
      .finally(() => setLoading(false));
  }, [state.load_size, state.address]);

  const today = todayEdmonton();
  const day = days.find((d) => d.date === activeDay);

  const pick = (date, slot, isCustom = false) => {
    update({
      job_date: date,
      job_time: slot.time,
      job_window_label: slot.window_label || null,
      job_window_start: slot.window_start || null,
      job_window_end: slot.window_end || null,
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
        We&apos;ll have your junk gone within 24 hours — pick any time that works for you.
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
          const displayLabel = s.display || s.label;
          return (
            <div key={s.time} className="relative">
              <SlotPill
                time={displayLabel}
                available
                sameDay={activeDay === today}
                selected={state.job_date === activeDay && state.job_time === s.time}
                onClick={() => pick(activeDay, s, day?.is_custom)}
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
function DetailsStep({ state, update, price, sessionId, onCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const nameValid = state.name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((state.email || '').trim());
  const valid = nameValid && emailValid && state.phone && state.address;

  const submit = async () => {
    if (!nameValid) {
      setError('Please enter your full name.');
      return;
    }
    if (!emailValid) {
      setError('Please enter a valid email address.');
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
          session_id: sessionId,
          email: state.email.trim(),
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
          freon_evacuation_claimed: state.analysis?.freon_evacuation_claimed || false,
          truck_size: state.truck_size || 15,
          job_date: state.job_date,
          job_time: state.job_time,
          job_window_label: state.job_window_label || null,
          job_window_start: state.job_window_start || null,
          job_window_end: state.job_window_end || null,
          photos: state.photoUrls,
          photo_skipped: state.photo_skipped,
          description_text: state.description_text || null,
          ai_load_estimate: state.analysis?.load_size || null,
          ai_weight_estimate_kg: state.analysis?.estimated_weight_kg || null,
          ai_volume_estimate_cuft: state.analysis?.estimated_volume_cuft || null,
          ai_landfill_weight_kg: state.analysis?.landfill_weight_kg ?? null,
          heavy_item_extra_minutes: state.analysis?.heavy_item_extra_minutes || 0,
          ai_confidence: state.analysis?.confidence || null,
          has_hazmat: state.analysis?.has_hazmat || false,
          hazmat_description: state.analysis?.hazmat_description || null,
          flag_for_review: state.analysis?.flag_for_review || false,
          flag_reason: state.analysis?.flag_reason || null,
          source: 'web',
          landing_path: window.location.pathname,
          referrer: document.referrer || null,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
          utm_content: new URLSearchParams(window.location.search).get('utm_content') || null,
          utm_term: new URLSearchParams(window.location.search).get('utm_term') || null,
          tracking_code: new URLSearchParams(window.location.search).get('code') || null,
          sms_consent_source: 'booking_payment_step',
          referral_code: state.referral_code || null,
          is_custom_slot: state.is_custom_slot || false,
          itemized_items: state.itemized?.items || null,
          possible_cross_photo_duplicates: state.possible_cross_photo_duplicates || null,
          photo_quote_tier: state.photo_quote_tier || null,
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
      <h2 className="text-2xl font-bold text-gray-900">Your estimated quote</h2>

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
          <span className="font-medium text-gray-900">
            {state.job_window_label
              ? `${state.job_window_label} (${state.job_window_start ? formatTimeDisplay(state.job_window_start) : ''}–${state.job_window_end ? formatTimeDisplay(state.job_window_end) : ''})`
              : state.job_time}
          </span>
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
          <span className="font-semibold text-gray-900">Estimated total</span>
          <span className="text-2xl font-bold text-gray-900">${displayTotal}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Deposit today</span>
          <span className="font-medium text-gray-700">$50</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Estimated balance on pickup</span>
          <span className="font-medium text-gray-700">${displayBalance}</span>
        </div>
      </div>
      {/* This screen's total is a client-side estimate (audit B1) --
          the real price is computed server-side from live cost data
          when you submit below, and that's what the next screen (and
          your deposit charge) actually reflects. */}
      <p className="text-[11px] text-gray-400 -mt-2">
        This is an estimate. We&apos;ll confirm your exact price after you submit, before you pay anything.
      </p>

      {/* Name + email collected here, right before payment */}
      <Field
        label="Full name"
        value={state.name}
        onChange={(v) => update({ name: v })}
        placeholder="Jane Doe"
      />

      <Field
        label="Email (for your receipt and booking confirmation)"
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
