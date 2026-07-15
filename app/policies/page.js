import Link from 'next/link';
// app/policies/page.js
export const metadata = {
  title: 'Policies — Junk Haul Calgary',
  description: 'All Junk Haul Calgary policies: privacy, crew privacy, safety, vehicle use, code of conduct, and uniform standards.',
};

export default function PoliciesPage() {
  const policies = [
    { href: '/privacy', title: 'Privacy Policy', desc: 'How we collect, use, and protect customer information.' },
    { href: '/crew-privacy', title: 'Crew Privacy Policy', desc: 'How we handle crew and employee personal information.' },
    { href: '/safety-policy', title: 'Safety Policy', desc: 'Health and safety policy for crew and contractors.' },
    { href: '/vehicle-use-policy', title: 'Vehicle Use Policy', desc: 'Company vehicle standards for crew and contractors.' },
    { href: '/code-of-conduct', title: 'Code of Conduct', desc: 'Standards of conduct for crew and contractors.' },
    { href: '/uniform-policy', title: 'Uniform Policy', desc: 'Uniform and PPE standards for crew.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <Link href="/" className="text-[#c4810e] hover:underline text-sm">&larr; Back to Junk Haul Calgary</Link>
        </div>
        <div className="mb-2 text-sm font-semibold text-[#c4810e] tracking-wide">JUNK HAUL CALGARY</div>
        <h1 className="text-3xl font-bold text-[#1a3a5c] mb-2">Policies</h1>
        <p className="mb-8 text-gray-600">All Junk Haul Calgary policies in one place. Effective July 14, 2026.</p>
        <div className="space-y-4">
          {policies.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="block p-6 rounded-lg border border-gray-200 hover:border-[#c4810e] hover:shadow-md transition-all"
            >
              <h2 className="text-lg font-semibold text-[#1a3a5c] mb-1">{p.title}</h2>
              <p className="text-sm text-gray-600">{p.desc}</p>
            </Link>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>Questions about our policies? Contact us at <a href="tel:5873254317" className="text-[#c4810e] hover:underline">(587) 325-4317</a> or <a href="mailto:info@junkhaul.ca" className="text-[#c4810e] hover:underline">info@junkhaul.ca</a></p>
        </div>
      </div>
    </div>
  );
}
