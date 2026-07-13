import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Eviction Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Eviction and tenant-left item cleanouts for Calgary landlords and property managers. Same-day, flat rate, donation of usable items.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Eviction Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How fast can you do an eviction cleanout?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We can typically schedule an eviction cleanout within 24 hours of your call, including large units with significant tenant-left items.',
      },
    },
  ],
};

export default function EvictionCleanoutsPage() {
  return (
    <SeoPage
      title="Eviction Cleanouts Calgary"
      intro="Tenant-left items cleared fast, so you can re-rent sooner."
      bullets={[
        'Full unit cleanouts after eviction',
        'Furniture, appliances, and personal items left behind',
        'Donation of usable items before landfill',
        'Works with your property manager or locksmith for access',
      ]}
      qa={[
        {
          question: 'How fast can you do an eviction cleanout?',
          answer: 'We can typically schedule an eviction cleanout within 24 hours of your call, including large units with significant tenant-left items.',
        },
      ]}
      links={[
        { href: '/commercial-junk-removal', label: 'Commercial Junk Removal' },
        { href: '/commercial-junk-removal/property-management', label: 'Property Management' },
      ]}
      ctaText="Call for a Same-Day Eviction Cleanout"
      ctaHref="tel:+15873250751"
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
