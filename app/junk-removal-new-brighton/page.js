import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in New Brighton | Junk Haul Calgary',
  description:
    'Same-day junk removal serving New Brighton. Garage cleanouts, renovation debris, furniture removal. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in New Brighton',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'New Brighton' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in New Brighton?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves New Brighton with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalNewBrightonPage() {
  return (
    <SeoPage
      title="Junk Removal in New Brighton"
      intro="From garage cleanouts to new-home renovation debris, Junk Haul Calgary is a regular presence in New Brighton. Serving New Brighton homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in New Brighton?',
          answer: 'Yes. Junk Haul Calgary serves New Brighton with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
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
