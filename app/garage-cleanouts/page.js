import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Garage Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Same-day garage cleanout service in Calgary. Flat rate pricing, guaranteed pickup within 24 hours. We donate what\'s still usable.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Garage Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does a garage cleanout cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pricing starts at $99 for a single item or small load, up to $380 for a full 15ft truck load. Most garage cleanouts fall in the small-to-half-load range.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you donate garage items?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Anything still usable is set aside and donated to Habitat for Humanity ReStore or Salvation Army, at no extra cost to you.',
      },
    },
  ],
};

export default function GarageCleanoutsPage() {
  return (
    <SeoPage
      title="Garage Cleanouts in Calgary"
      intro="Get your garage back. Same-day and next-day pickup, guaranteed within 24 hours."
      bullets={[
        'Years of accumulated stuff, old furniture, or renovation leftovers cleared in a single visit',
        'Flat rate pricing based on load size, no hourly surprises',
        'Usable items donated to Habitat for Humanity ReStore or Salvation Army',
        'We sweep up after — you get your garage back clean',
      ]}
      qa={[
        {
          question: 'How much does a garage cleanout cost?',
          answer: 'Pricing starts at $99 for a single item or small load, up to $380 for a full 15ft truck load. Most garage cleanouts fall in the small-to-half-load range.',
        },
        {
          question: 'Do you donate garage items?',
          answer: 'Yes. Anything still usable is set aside and donated to Habitat for Humanity ReStore or Salvation Army, at no extra cost to you.',
        },
      ]}
      links={[
        { href: '/junk-removal-cranston', label: 'Cranston' },
        { href: '/junk-removal-mahogany', label: 'Mahogany' },
        { href: '/junk-removal-panorama-hills', label: 'Panorama Hills' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
