import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Evergreen | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Evergreen. Estate cleanouts, garage cleanouts, furniture removal. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Evergreen',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Evergreen' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Evergreen?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Evergreen with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalEvergreenPage() {
  return (
    <SeoPage
      title="Junk Removal in Evergreen"
      intro="From estate cleanouts to garage clear-outs, Junk Haul Calgary is a regular presence in Evergreen's established community. Serving Evergreen homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Evergreen?',
          answer: 'Yes. Junk Haul Calgary serves Evergreen with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/estate-cleanouts', label: 'Estate Cleanouts' },
        { href: '/garage-cleanouts', label: 'Garage Cleanouts' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
