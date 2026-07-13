import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Construction Debris Removal Calgary | Junk Haul Calgary',
  description:
    'Construction site debris removal for Calgary contractors. Drywall, lumber, packaging, fixtures. Same-day, flat rate.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Construction Debris Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can you do multiple pickups during a project?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Book each pickup as needed — same 24-hour guarantee applies. Most contractors schedule a cleanup after demo and another after finishing.',
      },
    },
  ],
};

export default function ConstructionDebrisPage() {
  return (
    <SeoPage
      title="Construction Debris Removal Calgary"
      intro="Job site debris gone fast, so your crew can keep working."
      bullets={[
        'Drywall, lumber, and framing scraps',
        'Packaging, pallets, and construction materials',
        'Old fixtures, cabinets, and flooring',
        'Mid-project cleanouts to keep the site moving',
      ]}
      qa={[
        {
          question: 'Can you do multiple pickups during a project?',
          answer: 'Yes. Book each pickup as needed — same 24-hour guarantee applies. Most contractors schedule a cleanup after demo and another after finishing.',
        },
      ]}
      links={[
        { href: '/commercial-junk-removal', label: 'Commercial Junk Removal' },
        { href: '/renovation-debris-removal', label: 'Residential Reno Debris' },
      ]}
      ctaText="Call to Schedule Debris Removal"
      ctaHref="tel:+15873250751"
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
