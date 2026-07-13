import './globals.css';
import PWARegister from '@/components/PWARegister';
import GA4 from '@/components/GA4';

export const metadata = {
  title: 'Junk Haul Calgary — Same Day Junk Removal',
  description:
    'Calgary junk removal. Book in 60 seconds, get an instant price from photos, same-day pickup available. Fully licensed and insured. Canadian owned and operated.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://junkhaul.ca'),
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JunkHaul',
  },
  openGraph: {
    title: 'Junk Haul Calgary — Same Day Junk Removal',
    description: 'Instant price from photos. Same day. No hidden fees. Fully licensed & insured.',
    url: 'https://junkhaul.ca',
    siteName: 'Junk Haul Calgary',
    locale: 'en_CA',
    type: 'website',
    images: [{ url: '/logo/stampede-alt.png', width: 256, height: 256, alt: 'Junk Haul Calgary' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Junk Haul Calgary — Same Day Junk Removal',
    description: 'Instant price. Same day. No hidden fees. Fully licensed & insured.',
    images: ['/logo/stampede-alt.png'],
  },
};

export const viewport = {
  themeColor: '#FAFAFA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Junk Haul Calgary',
  description:
    'Same-day junk removal in Calgary. Instant price from photos. Furniture, appliances, renovation debris, yard waste and more. Fully licensed and insured. Canadian owned.',
  url: 'https://junkhaul.ca',
  telephone: '+15873250751',
  priceRange: '$99 - $380',
  currenciesAccepted: 'CAD',
  paymentAccepted: 'Cash, Credit Card',
  areaServed: {
    '@type': 'City',
    name: 'Calgary',
    sameAs: 'https://en.wikipedia.org/wiki/Calgary',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Calgary',
    addressRegion: 'AB',
    addressCountry: 'CA',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '07:30',
      closes: '17:00',
    },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Junk Removal Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: '1–2 Item Pickup',
          description: 'Single item or small pickup — couch, mattress, fridge, etc.',
        },
        price: '99',
        priceCurrency: 'CAD',
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Small Load',
          description: 'A few items and boxes, roughly a quarter of a 15ft truck.',
        },
        price: '160',
        priceCurrency: 'CAD',
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Half Load',
          description: 'Half a 15ft truck.',
        },
        price: '240',
        priceCurrency: 'CAD',
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Full Load',
          description: 'Full 15ft truck.',
        },
        price: '380',
        priceCurrency: 'CAD',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PWARegister />
        <GA4 />
        {children}
      </body>
    </html>
  );
}
