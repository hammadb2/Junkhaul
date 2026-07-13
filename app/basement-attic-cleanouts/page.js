import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Basement & Attic Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Basement and attic cleanout service in Calgary. Flat rate, 24-hour pickup guarantee, donation of usable items.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Basement and Attic Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you charge extra for stairs?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, $25 per flight of stairs. Most basements are one flight, most attics are one flight via pull-down ladder.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does a basement cleanout cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most basement cleanouts are a half load ($240) to full load ($380), depending on how much is down there.',
      },
    },
  ],
};

export default function BasementAtticCleanoutsPage() {
  return (
    <SeoPage
      title="Basement & Attic Cleanouts Calgary"
      intro="Reclaim your basement or attic. Same-day pickup, flat rate pricing, no hourly surprises."
      bullets={[
        'Years of stored items cleared in one visit',
        'Old furniture, boxes, holiday decor, and appliances',
        'Renovation leftovers from basement developments',
        'We carry everything up the stairs — no lifting for you',
      ]}
      qa={[
        {
          question: 'Do you charge extra for stairs?',
          answer: 'Yes, $25 per flight of stairs. Most basements are one flight, most attics are one flight via pull-down ladder.',
        },
        {
          question: 'How much does a basement cleanout cost?',
          answer: 'Most basement cleanouts are a half load ($240) to full load ($380), depending on how much is down there.',
        },
      ]}
      links={[
        { href: '/junk-removal-panorama-hills', label: 'Panorama Hills' },
        { href: '/junk-removal-cornerstone', label: 'Cornerstone' },
        { href: '/junk-removal-new-brighton', label: 'New Brighton' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
