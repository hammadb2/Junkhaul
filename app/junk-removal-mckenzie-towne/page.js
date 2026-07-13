import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in McKenzie Towne | Junk Haul Calgary',
  description:
    'Same-day junk removal serving McKenzie Towne. Estate cleanouts, garage cleanouts, renovation debris. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in McKenzie Towne',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'McKenzie Towne' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in McKenzie Towne?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves McKenzie Towne with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalMcKenzieTownerPage() {
  return (
    <SeoPage
      title="Junk Removal in McKenzie Towne"
      intro="From estate cleanouts to garage clear-outs, Junk Haul Calgary is a regular presence in McKenzie Towne's established neighborhoods. Serving McKenzie Towne homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in McKenzie Towne?',
          answer: 'Yes. Junk Haul Calgary serves McKenzie Towne with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/estate-cleanouts', label: 'Estate Cleanouts' },
        { href: '/basement-attic-cleanouts', label: 'Basement & Attic Cleanouts' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
