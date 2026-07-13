import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Junk Removal for Calgary Property Managers | Junk Haul Calgary',
  description:
    'Recurring turnover cleanouts for Calgary property managers. Standing arrangements, 24-hour pickup guarantee, flat rate pricing.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Property Management Junk Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can we set up a recurring arrangement?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Property managers with ongoing needs can request a standing service agreement, contact us to discuss your portfolio.',
      },
    },
  ],
};

export default function PropertyManagementPage() {
  return (
    <SeoPage
      title="Junk Removal for Calgary Property Managers"
      intro="Recurring turnover cleanouts, on your schedule, not ours."
      bullets={[
        'Standing service agreements for ongoing turnover needs',
        'Unit cleanouts between tenants',
        'Common area and hallway cleanouts',
        'Tenant-left items and eviction debris',
      ]}
      qa={[
        {
          question: 'Can we set up a recurring arrangement?',
          answer: 'Yes. Property managers with ongoing needs can request a standing service agreement, contact us to discuss your portfolio.',
        },
      ]}
      links={[
        { href: '/commercial-junk-removal', label: 'Commercial Junk Removal' },
        { href: '/commercial-junk-removal/eviction-cleanouts', label: 'Eviction Cleanouts' },
      ]}
      ctaText="Call to Discuss Your Portfolio"
      ctaHref="tel:+15873250751"
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
