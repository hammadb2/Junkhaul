'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

// ============================================================
// Reduced-motion hook — disables all animation when the OS asks.
// ============================================================
export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

// ============================================================
// BUTTON — use for ALL CTAs
// ============================================================
export function BookButton({ children, onClick, disabled, type = 'button', className = '' }) {
  const reduced = useReducedMotionPref();
  return (
    <motion.button
      type={type}
      whileHover={reduced || disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={reduced || disabled ? {} : { scale: 0.97, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full bg-orange-500 disabled:bg-orange-300 text-white font-bold py-4 rounded-2xl text-lg tracking-wide ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ============================================================
// LOAD SIZE CARD
// ============================================================
export function LoadCard({ selected, onClick, children }) {
  const reduced = useReducedMotionPref();
  return (
    <motion.div
      whileTap={reduced ? {} : { scale: 0.96 }}
      animate={{
        opacity: selected ? 1 : 0.6,
        borderColor: selected ? '#f97316' : '#e5e7eb',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className="border-2 rounded-2xl p-4 cursor-pointer bg-white"
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// PAGE TRANSITION variants
// ============================================================
export const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ============================================================
// ANIMATED PRICE COUNTER
// ============================================================
export function AnimatedPrice({ price }) {
  const reduced = useReducedMotionPref();
  const count = useMotionValue(price);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (reduced) {
      count.set(price);
      return;
    }
    const controls = animate(count, price, { duration: 0.4, ease: 'easeOut' });
    return controls.stop;
  }, [price, reduced, count]);

  return <motion.span>{rounded}</motion.span>;
}

// ============================================================
// CONFIRMATION CHECKMARK (draws itself)
// ============================================================
export const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.6, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
};

// ============================================================
// BOTTOM SHEET variants
// ============================================================
export const bottomSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 28 },
  },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

// ============================================================
// TIME SLOT PILL
// ============================================================
export function SlotPill({ selected, available, sameDay, time, onClick }) {
  const reduced = useReducedMotionPref();
  return (
    <motion.button
      whileTap={available && !reduced ? { scale: 0.95 } : {}}
      animate={{
        backgroundColor: selected ? '#f97316' : available ? '#ffffff' : '#f3f4f6',
        color: selected ? '#ffffff' : available ? '#111827' : '#9ca3af',
        borderColor: selected ? '#f97316' : available ? '#d1d5db' : '#e5e7eb',
      }}
      transition={{ duration: 0.15 }}
      onClick={available ? onClick : undefined}
      className="px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap flex-shrink-0"
    >
      {sameDay && '⚡'}
      {time}
    </motion.button>
  );
}

// ============================================================
// PROGRESS BAR (photo analysis) — NOT a spinner
// ============================================================
export function ProgressBar() {
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-orange-500 rounded-full"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />
    </div>
  );
}
