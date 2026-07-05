import './globals.css';

export const metadata = {
  title: 'Junk Haul Calgary. Same Day. Calgary.',
  description:
    'Your junk, gone today. Book junk removal in 60 seconds. Instant price from photos. No hidden fees. Same-day pickup in Calgary.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca'),
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/favicon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Junk Haul Calgary. Same Day. Calgary.',
    description: 'Instant price. Same day. No hidden fees.',
    url: 'https://junkhaul.ca',
    siteName: 'Junk Haul Calgary',
    locale: 'en_CA',
    type: 'website',
    images: [{ url: '/logo/stampede-banner.png', width: 800, height: 533, alt: 'Junk Haul Calgary' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Junk Haul Calgary. Same Day. Calgary.',
    description: 'Instant price. Same day. No hidden fees.',
    images: ['/logo/stampede-banner.png'],
  },
};

export const viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
