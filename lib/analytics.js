'use client';

// ============================================================
// Analytics helpers — fire GA4 conversion events from client
// components (booking confirmation, commercial quote submit).
//
// Usage:
//   import { trackConversion } from '@/lib/analytics';
//   trackConversion('booking_completed', { value: 50, currency: 'CAD' });
// ============================================================

export function trackConversion(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, {
    ...params,
    send_to: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  });
}

export function trackPageView(path) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: path,
    send_to: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  });
}
