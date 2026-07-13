'use client';

import Script from 'next/script';

// ============================================================
// GA4 — Google Analytics 4 script loader.
// Only loads if NEXT_PUBLIC_GA4_MEASUREMENT_ID is set, so dev
// and preview environments don't send page views.
//
// Conversion events are fired from the booking confirmation
// step (app/book/page.js) and the commercial quote form.
// ============================================================

export default function GA4() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
