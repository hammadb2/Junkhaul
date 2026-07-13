import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Estate Cleanouts Calgary | Junk Haul Calgary',
  description:
    'Compassionate, same-day estate cleanout service in Calgary. Flat rate pricing, careful handling, donation of usable items.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Estate Cleanout',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How fast can you do an estate cleanout?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We can schedule most estate cleanouts within 24 hours of your call, including large multi-room jobs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you sort items before removal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. We flag anything still usable and route it to donation rather than the landfill, and can work with your timeline if you need to review items first.',
      },
    },
  ],
};

export default function EstateCleanoutsPage() {
  return (
    <SeoPage
      title="Estate Cleanouts in Calgary"
      intro="A hard job made simpler. Fast, respectful, and handled with care."
      bullets={[
        'Clearing a family member\'s home is rarely easy — we handle it with the same care we\'d want for our own family',
        'We sort what can be donated, and clear the rest quickly so you can focus on what matters',
        'Careful handling of furniture, keepsakes, and household items',
        'Works with your timeline if you need to review items before removal',
      ]}
      qa={[
        {
          question: 'How fast can you do an estate cleanout?',
          answer: 'We can schedule most estate cleanouts within 24 hours of your call, including large multi-room jobs.',
        },
        {
          question: 'Do you sort items before removal?',
          answer: 'Yes. We flag anything still usable and route it to donation rather than the landfill, and can work with your timeline if you need to review items first.',
        },
      ]}
      ctaText="Call for a Same-Day Estate Cleanout"
      ctaHref="tel:+15873250751"
      links={[
        { href: '/junk-removal-evergreen', label: 'Evergreen' },
        { href: '/junk-removal-mckenzie-towne', label: 'McKenzie Towne' },
        { href: '/junk-removal-coventry-hills', label: 'Coventry Hills' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
