import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Commercial Junk Removal Calgary | Junk Haul Calgary',
  description:
    'Office cleanouts, construction debris, retail turnovers, and eviction cleanouts across Calgary. Same-day availability, flat quotes, no surprise invoices.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Commercial Junk Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do you offer same-day commercial pickup?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We schedule commercial jobs within 24 hours of your request, same as our residential guarantee.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does commercial pricing work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Commercial jobs are quoted based on volume and access, not a flat residential rate. Request a quote and we\'ll respond the same day.',
      },
    },
  ],
};

export default function CommercialJunkRemovalPage() {
  return (
    <SeoPage
      title="Commercial Junk Removal Calgary"
      intro="Same day availability. Flat quotes. No surprise invoices."
      bullets={[
        'Office cleanouts and business relocations',
        'Construction and renovation debris',
        'Retail space turnovers between tenants',
        'Eviction and unit cleanouts',
        'Warehouse and storage liquidations',
      ]}
      qa={[
        {
          question: 'Do you offer same-day commercial pickup?',
          answer: 'Yes. We schedule commercial jobs within 24 hours of your request, same as our residential guarantee.',
        },
        {
          question: 'How does commercial pricing work?',
          answer: 'Commercial jobs are quoted based on volume and access, not a flat residential rate. Request a quote and we\'ll respond the same day.',
        },
      ]}
      links={[
        { href: '/commercial-junk-removal/property-management', label: 'Property Management' },
        { href: '/commercial-junk-removal/construction-debris', label: 'Construction Debris' },
        { href: '/commercial-junk-removal/office-cleanouts', label: 'Office Cleanouts' },
        { href: '/commercial-junk-removal/eviction-cleanouts', label: 'Eviction Cleanouts' },
      ]}
      ctaText="Request a Commercial Quote"
      ctaHref="tel:+15873250751"
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
