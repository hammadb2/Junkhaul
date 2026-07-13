import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Coventry Hills | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Coventry Hills. Garage cleanouts, furniture removal, appliance pickup. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Coventry Hills',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Coventry Hills' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Coventry Hills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Coventry Hills with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalCoventryHillsPage() {
  return (
    <SeoPage
      title="Junk Removal in Coventry Hills"
      intro="From garage cleanouts to furniture upgrades, Junk Haul Calgary is local home turf in Coventry Hills — we know the area because we work here. Serving Coventry Hills homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Coventry Hills?',
          answer: 'Yes. Junk Haul Calgary serves Coventry Hills with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/garage-cleanouts', label: 'Garage Cleanouts' },
        { href: '/furniture-removal', label: 'Furniture Removal' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
