import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Office Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Office cleanout and business relocation junk removal in Calgary. Desks, chairs, electronics, cubicles. Same-day, flat rate.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Office Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can you work after hours to avoid disruption?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We can schedule office cleanouts after business hours or on weekends to avoid disrupting your team.',
      },
    },
  ],
};

export default function OfficeCleanoutsPage() {
  return (
    <SeoPage
      title="Office Cleanouts Calgary"
      intro="Office furniture, electronics, and clutter cleared without disrupting your workday."
      bullets={[
        'Desks, chairs, cubicles, and workstations',
        'Electronics — monitors, printers, old computers',
        'Filing cabinets and document storage',
        'Break room appliances and furniture',
      ]}
      qa={[
        {
          question: 'Can you work after hours to avoid disruption?',
          answer: 'Yes. We can schedule office cleanouts after business hours or on weekends to avoid disrupting your team.',
        },
      ]}
      links={[
        { href: '/commercial-junk-removal', label: 'Commercial Junk Removal' },
        { href: '/furniture-removal', label: 'Furniture Removal' },
      ]}
      ctaText="Call to Schedule an Office Cleanout"
      ctaHref="tel:+15873250751"
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
