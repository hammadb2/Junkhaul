import SeoPage from '@/components/SeoPage';

export const metadata = {
  title: 'Appliance Removal Calgary | Junk Haul Calgary',
  description:
    'Fridge, freezer, washer, dryer, and appliance removal in Calgary. Same-day pickup, $40 Freon fee for refrigerants.',
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Appliance Removal',
  provider: { '@type': 'LocalBusiness', name: 'Junk Haul Calgary' },
  areaServed: { '@type': 'City', name: 'Calgary' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does appliance removal cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A single appliance is $99. A fridge or freezer with Freon is $99 + $40 Freon removal fee = $139. Multiple appliances are priced by load size.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you recycle appliances?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Metal appliances are taken to a recycling facility, not the landfill. Refrigerants are properly extracted and disposed of.',
      },
    },
  ],
};

export default function ApplianceRemovalPage() {
  return (
    <SeoPage
      title="Appliance Removal Calgary"
      intro="Old appliances hauled away same-day. Fridges, freezers, washers, dryers, stoves, and more."
      bullets={[
        'Refrigerators and freezers (Freon removal included)',
        'Washers, dryers, and laundry units',
        'Stoves, ovens, and microwaves',
        'Dishwashers, water heaters, and AC units',
      ]}
      qa={[
        {
          question: 'How much does appliance removal cost?',
          answer: 'A single appliance is $99. A fridge or freezer with Freon is $99 + $40 Freon removal fee = $139. Multiple appliances are priced by load size.',
        },
        {
          question: 'Do you recycle appliances?',
          answer: 'Yes. Metal appliances are taken to a recycling facility, not the landfill. Refrigerants are properly extracted and disposed of.',
        },
      ]}
      links={[
        { href: '/junk-removal-mahogany', label: 'Mahogany' },
        { href: '/junk-removal-panorama-hills', label: 'Panorama Hills' },
        { href: '/junk-removal-cornerstone', label: 'Cornerstone' },
      ]}
      jsonLd={[serviceJsonLd, faqJsonLd]}
    />
  );
}
