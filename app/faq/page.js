// app/faq/page.js — server component with FAQPage schema
import FaqClient from './FaqClient';

export const metadata = {
  title: 'What We Haul — Junk Haul Calgary',
  description:
    'Full list of items Junk Haul Calgary accepts and cannot accept, pricing add-ons, service hours (Sundays), and cancellation policy.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What days do you operate?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We run pickups on Sundays only. Available time slots are 7:30 AM, 9:00 AM, 11:00 AM, and 1:00 PM. Same-day pickup is available when slots are open.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does pricing work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pricing is based on load size. Single item or 1-2 large items: $99. Small load (quarter truck): $160. Half load: $240. Full 15ft truck: $380. Add-ons include $40 per Freon appliance (fridge, freezer, AC), $25 per flight of stairs, and $50 for same-day pickup.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are you licensed and insured?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Junk Haul Calgary is fully licensed and insured.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is your cancellation policy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cancel more than 24 hours before your pickup for a full $50 deposit refund. Cancel within 24 hours and the deposit is non-refundable. If we cancel on you, you get a full refund plus priority rebooking.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you take refrigerators?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, we take refrigerators, freezers, air conditioners, and water coolers. There is a $40 Freon removal fee per appliance.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I pay?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A $50 deposit is paid online via Stripe when you book to lock in your time slot. The remaining balance is paid on pickup day by cash or card.',
      },
    },
    {
      '@type': 'Question',
      name: 'What items can you not take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We cannot take: open or liquid paint cans, pool chemicals, pesticides, cleaning solvents, gasoline, diesel, motor oil, propane tanks, asbestos, medical waste, sharps, car batteries, tires, ammunition, or compressed gas cylinders. The City of Calgary has free hazardous waste drop-off — check calgary.ca/waste for dates.',
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqClient />
    </>
  );
}
