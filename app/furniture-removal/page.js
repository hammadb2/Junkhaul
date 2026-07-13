import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Furniture Removal Calgary | Junk Haul Calgary',
  description:
    'Couch, mattress, bed, and furniture removal in Calgary. Same-day pickup, flat rate, 24-hour guarantee.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Furniture Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does furniture removal cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A single large item like a couch or mattress is $99. A few pieces of furniture is typically a small load at $160.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you donate old furniture?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Furniture in good condition is donated to Habitat for Humanity ReStore or Salvation Army at no extra cost.',
      },
    },
  ],
};

export default function FurnitureRemovalPage() {
  return (
    <SeoPage
      title="Furniture Removal Calgary"
      intro="Old couch, broken bed, saggy mattress — gone today. Same-day furniture pickup across Calgary."
      bullets={[
        'Sofas, sectionals, recliners, and armchairs',
        'Mattresses and box springs (any size)',
        'Beds, dressers, nightstands, and wardrobes',
        'Desks, tables, chairs, and shelving units',
      ]}
      qa={[
        {
          question: 'How much does furniture removal cost?',
          answer: 'A single large item like a couch or mattress is $99. A few pieces of furniture is typically a small load at $160.',
        },
        {
          question: 'Do you donate old furniture?',
          answer: 'Yes. Furniture in good condition is donated to Habitat for Humanity ReStore or Salvation Army at no extra cost.',
        },
      ]}
      links={[
        { href: '/junk-removal-cranston', label: 'Cranston' },
        { href: '/junk-removal-coventry-hills', label: 'Coventry Hills' },
        { href: '/junk-removal-evergreen', label: 'Evergreen' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
