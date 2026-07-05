'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { BookButton } from '@/components/motion';

export default function FAQPage() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-md mx-auto">
      <Link href="/">
        <Logo className="h-8 mb-6" />
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">What we haul</h1>
      <p className="text-gray-500 text-sm mb-6">
        Almost anything — here&apos;s the full list.
      </p>

      <Section title="✅ We haul these (included in base price)">
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li><b>Furniture:</b> sofas, armchairs, recliners, beds, mattresses, box springs, dressers, wardrobes, dining tables, chairs, coffee tables, bookshelves, desks</li>
          <li><b>Appliances (no Freon):</b> washing machines, dryers, dishwashers, stoves, ovens, microwaves, toasters, small appliances</li>
          <li><b>Electronics:</b> TVs, computers, monitors, printers, stereos, gaming consoles (e-waste)</li>
          <li><b>Renovation debris:</b> drywall, lumber, flooring, tiles, bathroom fixtures, doors, windows</li>
          <li><b>Yard waste:</b> branches, shrubs, garden furniture, old sheds (broken down), soil bags</li>
          <li><b>General household:</b> boxes, clothing, toys, books, tools, exercise equipment</li>
          <li>Garage cleanouts, basement cleanouts, attic cleanouts</li>
          <li>Estate cleanouts (large jobs require phone quote)</li>
          <li>Hot tubs (require phone quote)</li>
          <li>Office furniture and equipment</li>
        </ul>
      </Section>

      <Section title="💰 Extra fees">
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li>Refrigerators / freezers / AC / water coolers: <b>+$40</b> (Freon removal)</li>
          <li>Stairs: <b>+$25</b> per flight</li>
          <li>Same-day pickup: <b>+$50</b></li>
        </ul>
      </Section>

      <Section title="🚫 We cannot haul these (no exceptions)">
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li>Open or liquid paint cans (dried solid paint only — harden with kitty litter first)</li>
          <li>Pool chemicals, pesticides, cleaning solvents, acids</li>
          <li>Gasoline, diesel, motor oil, hydraulic fluid</li>
          <li>Propane tanks (full or empty)</li>
          <li>Asbestos-containing materials (requires certified HAZMAT removal)</li>
          <li>Medical waste, sharps, biohazardous materials</li>
          <li>Car batteries (Canadian Tire accepts these free)</li>
          <li>Tires (City of Calgary accepts these — calgary.ca/waste)</li>
          <li>Ammunition or explosives</li>
          <li>Compressed gas cylinders</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          The City of Calgary has free hazardous waste drop-off events. Check{' '}
          <a href="https://www.calgary.ca/waste" className="text-orange-600 underline" target="_blank" rel="noopener noreferrer">
            calgary.ca/waste
          </a>{' '}
          for dates.
        </p>
      </Section>

      <Section title="📅 When do we run?">
        <p className="text-sm text-gray-700">
          Pickups are <b>Thursdays and Sundays only</b>. Same-day pickup is available on those days when slots are open. Slots: 7:30 AM, 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM.
        </p>
      </Section>

      <Section title="💳 How does payment work?">
        <p className="text-sm text-gray-700">
          A <b>$50 deposit</b> locks in your booking (paid online via Stripe). The remaining balance is paid on pickup day by cash or card.
        </p>
      </Section>

      <Section title="↩️ Cancellation policy">
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li>More than 24 hours before pickup: <b>full $50 refund</b></li>
          <li>Within 24 hours: deposit is non-refundable</li>
          <li>If we cancel: full refund + priority rebooking</li>
        </ul>
      </Section>

      <div className="mt-6">
        <Link href="/book">
          <BookButton>📷 Get your instant price →</BookButton>
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6 mb-4">
        Questions? Call us or text any time.
      </p>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-4">{children}</div>
    </div>
  );
}
