import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Storage Unit Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Storage unit cleanout and eviction cleanout service in Calgary. Flat rate, 24-hour pickup guarantee.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Storage Unit Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can you access my storage unit if I\'m not there?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, if you provide the gate code and unit number. We\'ll text you photos of what we removed.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does a storage unit cleanout cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A typical 5x10 or 10x10 unit is a half load ($240). A packed 10x20 is usually a full load ($380).',
      },
    },
  ],
};

export default function StorageUnitCleanoutsPage() {
  return (
    <SeoPage
      title="Storage Unit Cleanouts Calgary"
      intro="Empty that storage unit and stop paying for stuff you don't need. Same-day pickup, flat rate."
      bullets={[
        'Full unit cleanouts — we show up with the truck and load everything',
        'Partial cleanouts — just the bulky stuff, you keep the rest',
        'Donation of usable items before they hit the landfill',
        'We meet you at the facility or pick up with your access code',
      ]}
      qa={[
        {
          question: 'Can you access my storage unit if I\'m not there?',
          answer: 'Yes, if you provide the gate code and unit number. We\'ll text you photos of what we removed.',
        },
        {
          question: 'How much does a storage unit cleanout cost?',
          answer: 'A typical 5x10 or 10x10 unit is a half load ($240). A packed 10x20 is usually a full load ($380).',
        },
      ]}
      links={[
        { href: '/junk-removal-auburn-bay', label: 'Auburn Bay' },
        { href: '/junk-removal-copperfield', label: 'Copperfield' },
        { href: '/junk-removal-mckenzie-towne', label: 'McKenzie Towne' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
