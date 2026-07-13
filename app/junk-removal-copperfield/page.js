import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Copperfield | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Copperfield. Garage cleanouts, storage unit cleanouts, renovation debris. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Copperfield',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Copperfield' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Copperfield?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Copperfield with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalCopperfieldPage() {
  return (
    <SeoPage
      title="Junk Removal in Copperfield"
      intro="From garage cleanouts to storage unit clear-outs, Junk Haul Calgary is a regular presence in Copperfield. Serving Copperfield homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Copperfield?',
          answer: 'Yes. Junk Haul Calgary serves Copperfield with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
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
