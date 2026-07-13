import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Cornerstone | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Cornerstone. New home furniture removal, renovation debris, appliance pickup. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Cornerstone',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Cornerstone' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Cornerstone?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Cornerstone with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalCornerstonePage() {
  return (
    <SeoPage
      title="Junk Removal in Cornerstone"
      intro="From new-home furniture deliveries to renovation debris, Junk Haul Calgary is a regular presence in Cornerstone's growing community. Serving Cornerstone homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Cornerstone?',
          answer: 'Yes. Junk Haul Calgary serves Cornerstone with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/furniture-removal', label: 'Furniture Removal' },
        { href: '/renovation-debris-removal', label: 'Renovation Debris' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
