import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Auburn Bay | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Auburn Bay. Garage cleanouts, furniture removal, storage unit cleanouts. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Auburn Bay',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Auburn Bay' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Auburn Bay?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Auburn Bay with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalAuburnBayPage() {
  return (
    <SeoPage
      title="Junk Removal in Auburn Bay"
      intro="From lake-home renovations to garage cleanouts, Junk Haul Calgary is a regular presence in Auburn Bay. Serving Auburn Bay homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Auburn Bay?',
          answer: 'Yes. Junk Haul Calgary serves Auburn Bay with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/storage-unit-cleanouts', label: 'Storage Unit Cleanouts' },
        { href: '/garage-cleanouts', label: 'Garage Cleanouts' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
