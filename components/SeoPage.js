import Link from 'next/link';

// ============================================================
// SeoPage — shared layout for SEO service/location pages.
// Server component, mobile-first, matches the homepage's
// visual language (orange CTA, max-w-md, clean typography).
//
// Props:
//   title (h1), intro (paragraph), bullets (array of strings),
//   qa (array of {question, answer}), ctaText, ctaHref,
//   links (array of {href, label} for internal linking)
//   jsonLd (object — Service or FAQPage schema)
// ============================================================

export default function SeoPage({
  title,
  intro,
  bullets = [],
  qa = [],
  ctaText = 'Get Instant Price From Photos',
  ctaHref = '/book',
  links = [],
  jsonLd = null,
}) {
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <main className="min-h-dvh flex flex-col px-6 py-8 max-w-md mx-auto">
        <Link href="/" className="text-sm text-gray-400 mb-6 inline-block">
          ← Junk Haul Calgary
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{title}</h1>

        {intro && <p className="mt-3 text-base text-gray-600">{intro}</p>}

        {bullets.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm text-gray-700">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-orange-500 font-bold mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {qa.map((item, i) => (
          <div key={i} className="mt-6">
            <h2 className="text-base font-semibold text-gray-900">{item.question}</h2>
            <p className="mt-1 text-sm text-gray-600">{item.answer}</p>
          </div>
        ))}

        <Link
          href={ctaHref}
          className="mt-8 flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-base tracking-wide active:scale-97"
        >
          {ctaText} →
        </Link>

        {links.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {links.length > 2 ? 'Serving these Calgary communities' : 'Related services'}
            </p>
            <div className="flex flex-wrap gap-2">
              {links.map((l, i) => (
                <Link
                  key={i}
                  href={l.href}
                  className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <a
            href="tel:+15873250751"
            className="block text-sm font-semibold text-orange-500"
          >
            📞 (587) 325-0751 — Call or text anytime
          </a>
          <p className="text-xs text-gray-400 mt-1">
            24-hour pickup guarantee · Same day · Calgary
          </p>
        </div>
      </main>
    </>
  );
}
