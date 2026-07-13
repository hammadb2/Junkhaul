import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal in Panorama Hills | Junk Haul Calgary',
  description:
    'Same-day junk removal serving Panorama Hills. Basement cleanouts, appliance removal, renovation debris. Flat rate, guaranteed within 24 hours.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Junk Removal in Panorama Hills',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Panorama Hills' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer junk removal in Panorama Hills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary serves Panorama Hills with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
      },
    },
  ],
};

export default function JunkRemovalPanoramaHillsPage() {
  return (
    <SeoPage
      title="Junk Removal in Panorama Hills"
      intro="From basement developments to appliance upgrades, Junk Haul Calgary is a regular presence in Panorama Hills. Serving Panorama Hills homeowners with same-day, guaranteed pickup."
      bullets={[
        'Garage cleanouts and basement developments',
        'Renovation debris and construction cleanup',
        'Furniture and appliance removal',
        'Usable items donated locally',
      ]}
      qa={[
        {
          question: 'Do you offer junk removal in Panorama Hills?',
          answer: 'Yes. Junk Haul Calgary serves Panorama Hills with garage cleanouts, basement developments, and renovation debris removal. Pricing starts at $99, based on load size.',
        },
      ]}
      links={[
        { href: '/basement-attic-cleanouts', label: 'Basement & Attic Cleanouts' },
        { href: '/appliance-removal', label: 'Appliance Removal' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
