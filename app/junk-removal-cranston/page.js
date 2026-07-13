import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Cranston | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Cranston. Garage cleanouts, basement developments, renovation debris. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Cranston',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Cranston' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Cranston?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Cranston with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalCranstonPage() {
  return (
    <SeoPage
      title="Junk Removal in Cranston"
      intro="From garage cleanouts to basement development debris, Junk Haul Calgary is a regular presence in Cranston. Serving Cranston homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Cranston?',
          answer: 'Yes. Junk Haul Calgary serves Cranston with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/garage-cleanouts', label: 'Garage Cleanouts' },
        { href: '/renovation-debris-removal', label: 'Renovation Debris' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
