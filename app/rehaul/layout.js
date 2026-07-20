import Link from 'next/link';

export const metadata = {
  title: 'Rehaul | Premium Circular Commerce',
  description: 'Pre-owned furniture, appliances and home goods curated by Junk Haul Calgary.',
  metadataBase: new URL('https://rehaul.junkhaul.ca'),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export default function RehaulLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          :root {
            --rehaul-bg: #F5F4F0;
            --rehaul-surface: #FFFFFF;
            --rehaul-ink: #1F1F1F;
            --rehaul-ink-secondary: #5E5E5E;
            --rehaul-accent: #5A6B5C;
            --rehaul-accent-light: #E8EBE8;
            --rehaul-border: #E2E2DF;
            --rehaul-radius: 12px;
            --rehaul-spacing-xs: 0.25rem;
            --rehaul-spacing-sm: 0.5rem;
            --rehaul-spacing-md: 1rem;
            --rehaul-spacing-lg: 2rem;
            --rehaul-spacing-xl: 4rem;
            --rehaul-type-display: clamp(2rem, 5vw, 4rem);
            --rehaul-type-heading: clamp(1.5rem, 3vw, 2.25rem);
            --rehaul-type-body: 1rem;
            --rehaul-type-small: 0.875rem;
          }
        `}</style>
      </head>
      <body style={{ background: 'var(--rehaul-bg)', color: 'var(--rehaul-ink)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <header style={{ padding: 'var(--rehaul-spacing-md) var(--rehaul-spacing-lg)', borderBottom: '1px solid var(--rehaul-border)', background: 'var(--rehaul-surface)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Rehaul</span>
            <nav style={{ display: 'flex', gap: 'var(--rehaul-spacing-md)' }}>
              <Link href="/" style={{ color: 'var(--rehaul-ink-secondary)', textDecoration: 'none' }}>Shop</Link>
              <Link href="/donate" style={{ color: 'var(--rehaul-ink-secondary)', textDecoration: 'none' }}>Donate</Link>
              <Link href="/about" style={{ color: 'var(--rehaul-ink-secondary)', textDecoration: 'none' }}>About</Link>
            </nav>
          </div>
        </header>
        <main style={{ minHeight: '80vh' }}>{children}</main>
        <footer style={{ padding: 'var(--rehaul-spacing-lg)', borderTop: '1px solid var(--rehaul-border)', color: 'var(--rehaul-ink-secondary)', textAlign: 'center' }}>
          Rehaul by Junk Haul Calgary — circular commerce for Calgary homes.
        </footer>
      </body>
    </html>
  );
}
