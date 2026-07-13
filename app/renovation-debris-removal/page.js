import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Renovation Debris Removal Calgary | Junk Haul Calgary',
  description:
    'Construction and renovation debris removal in Calgary. Drywall, lumber, tiles, fixtures. Same-day, flat rate.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Renovation Debris Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does renovation debris removal cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most renovation cleanouts are a half load ($240) to full load ($380), depending on the scope of the project. Single-item pickups of large debris start at $99.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can you come mid-project for a partial cleanup?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We can do multiple pickups during a renovation — just book each one as needed, same 24-hour guarantee applies.',
      },
    },
  ],
};

export default function RenovationDebrisRemovalPage() {
  return (
    <SeoPage
      title="Renovation Debris Removal Calgary"
      intro="Post-reno cleanup, done fast. Drywall, lumber, tiles, old fixtures — we haul it all away."
      bullets={[
        'Drywall, lumber, and framing scraps',
        'Old flooring — tile, carpet, laminate, vinyl',
        'Cabinets, countertops, and fixtures',
        'Concrete, brick, and landscaping debris',
      ]}
      qa={[
        {
          question: 'How much does renovation debris removal cost?',
          answer: 'Most renovation cleanouts are a half load ($240) to full load ($380), depending on the scope of the project. Single-item pickups of large debris start at $99.',
        },
        {
          question: 'Can you come mid-project for a partial cleanup?',
          answer: 'Yes. We can do multiple pickups during a renovation — just book each one as needed, same 24-hour guarantee applies.',
        },
      ]}
      links={[
        { href: '/junk-removal-cranston', label: 'Cranston' },
        { href: '/junk-removal-new-brighton', label: 'New Brighton' },
        { href: '/junk-removal-copperfield', label: 'Copperfield' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
