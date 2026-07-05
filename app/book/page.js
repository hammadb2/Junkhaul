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

const STEPS = ['photos', 'load', 'schedule', 'details', 'payment', 'done'];

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
  const [step, setStep] = useState('photos');
  const [state, setState] = useState({
    photos: [],
    photoUrls: [],
    photo_skipped: false,
    description_text: '',
    analysis: null,
    load_size: 'quarter',
    same_day: false,
    stairs: 0,
    has_freon: false,
    job_date: null,
    job_time: null,
    name: '',
    phone: '',
    email: '',
    address: '',
    unit: '',
  });
  const [booking, setBooking] = useState(null);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const stepIndex = STEPS.indexOf(step);

  const price = calculatePrice({
    load_size: state.load_size,
    same_day: state.same_day,
    stairs: state.stairs,
    has_freon: state.has_freon,
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
            {STEPS.slice(0, 5).map((s, i) => (
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
          {step === 'photos' && (
            <PhotoStep state={state} update={update} onNext={() => setStep('load')} />
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
              }}
            />
          )}
          {step === 'payment' && booking && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Confirm & pay</h2>
              <p className="text-gray-500 text-sm mb-5">
                Just a $50 deposit today — the rest on pickup day.
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
// STEP 1 — PHOTOS
// ============================================================
function PhotoStep({ state, update, onNext }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showDescribe, setShowDescribe] = useState(false);
  const fileRef = useRef(null);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (files.length === 0) return;
    const base64s = await Promise.all(files.map(toBase64));
    update({ photos: base64s });
    analyze(base64s, null);
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
        photoUrls: data.photoUrls || [],
        photo_skipped: false,
      });
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
          <button
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl py-12 flex flex-col items-center gap-2 text-gray-500"
          >
            <span className="text-4xl">📷</span>
            <span className="font-semibold text-gray-700">Take / upload photos</span>
            <span className="text-xs">Up to 5 photos</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFiles}
          />

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
            Skip — I&apos;ll pick my load size myself
          </button>
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
        <Toggle
          label="Freon appliance (fridge, freezer, AC)"
          sub={`+$${PRICING.freon}`}
          checked={state.has_freon}
          onChange={(v) => update({ has_freon: v })}
        />
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Stairs</div>
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
      </div>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-gray-500">Your price</span>
        <span className="text-3xl font-bold text-gray-900">
          $<AnimatedPrice price={price.total} />
        </span>
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
      <p className="text-gray-500 text-sm -mt-2">We run Thursdays & Sundays.</p>

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
          load_size: state.load_size,
          same_day: state.same_day,
          stairs: state.stairs,
          has_freon: state.has_freon,
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
      <Field
        label="Pickup address"
        value={state.address}
        onChange={(v) => update({ address: v })}
        placeholder="123 5 Ave NE, Calgary"
      />
      <Field
        label="Unit / buzzer (optional)"
        value={state.unit}
        onChange={(v) => update({ unit: v })}
        placeholder="Apt 204"
      />

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
