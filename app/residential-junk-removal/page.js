import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Residential Junk Removal Calgary | Junk Haul Calgary',
  description:
    'Same-day residential junk removal across Calgary. Flat rate pricing, 24-hour pickup guarantee, donation of usable items.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Residential Junk Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How quickly can you pick up?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Every booking is guaranteed pickup within 24 hours, any day of the week.',
      },
    },
    {
      '@type': 'Question',
      name: 'What sizes do you handle?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'From a single item ($99) to a full 15ft truck load ($380). Most residential jobs are a small or half load.',
      },
    },
  ],
};

export default function ResidentialJunkRemovalPage() {
  return (
    <SeoPage
      title="Residential Junk Removal Calgary"
      intro="Home junk gone fast. From single items to full house cleanouts, guaranteed within 24 hours."
      bullets={[
        'Furniture, appliances, electronics, and household items',
        'Garage, basement, and attic cleanouts',
        'Renovation and moving debris',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'How quickly can you pick up?',
          answer: 'Every booking is guaranteed pickup within 24 hours, any day of the week.',
        },
        {
          question: 'What sizes do you handle?',
          answer: 'From a single item ($99) to a full 15ft truck load ($380). Most residential jobs are a small or half load.',
        },
      ]}
      links={[
        { href: '/junk-removal-cranston', label: 'Cranston' },
        { href: '/junk-removal-mahogany', label: 'Mahogany' },
        { href: '/junk-removal-evergreen', label: 'Evergreen' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
