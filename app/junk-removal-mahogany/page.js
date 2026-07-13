import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Mahogany | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Mahogany. Garage cleanouts, lake home furniture, renovation debris. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Mahogany',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Mahogany' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Mahogany?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Mahogany with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalMahoganyPage() {
  return (
    <SeoPage
      title="Junk Removal in Mahogany"
      intro="From lake-home furniture upgrades to garage cleanouts, Junk Haul Calgary is a regular presence in Mahogany's lake community. Serving Mahogany homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Mahogany?',
          answer: 'Yes. Junk Haul Calgary serves Mahogany with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/furniture-removal', label: 'Furniture Removal' },
        { href: '/garage-cleanouts', label: 'Garage Cleanouts' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
