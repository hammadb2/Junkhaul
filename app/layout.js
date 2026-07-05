import './globals.css';

export const metadata = {
  title: 'Junk Haul Calgary — Same Day. Calgary.',
  description:
    'Your junk, gone today. Book junk removal in 60 seconds. Instant price from photos. No hidden fees. Same-day pickup in Calgary.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca'),
  openGraph: {
    title: 'Junk Haul Calgary — Same Day. Calgary.',
    description: 'Instant price. Same day. No hidden fees.',
    url: 'https://junkhaul.ca',
    siteName: 'Junk Haul Calgary',
    locale: 'en_CA',
    type: 'website',
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
