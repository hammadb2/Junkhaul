export const runtime = 'edge';

export default function RehaulHomePage() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'var(--rehaul-spacing-xl) var(--rehaul-spacing-lg)' }}>
      <section style={{ textAlign: 'center', marginBottom: 'var(--rehaul-spacing-xl)' }}>
        <h1 style={{ fontSize: 'var(--rehaul-type-display)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 'var(--rehaul-spacing-md)' }}>
          Furniture with a second story.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--rehaul-ink-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Rehaul sells quality-checked, pre-owned furniture and home goods diverted from landfill.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--rehaul-spacing-lg)' }}>
        <div style={{ background: 'var(--rehaul-surface)', borderRadius: 'var(--rehaul-radius)', padding: 'var(--rehaul-spacing-lg)', border: '1px solid var(--rehaul-border)' }}>
          <h2 style={{ fontSize: 'var(--rehaul-type-heading)', marginBottom: 'var(--rehaul-spacing-sm)' }}>Verified condition</h2>
          <p style={{ color: 'var(--rehaul-ink-secondary)', lineHeight: 1.6 }}>Every item is photographed, measured and graded before listing.</p>
        </div>
        <div style={{ background: 'var(--rehaul-surface)', borderRadius: 'var(--rehaul-radius)', padding: 'var(--rehaul-spacing-lg)', border: '1px solid var(--rehaul-border)' }}>
          <h2 style={{ fontSize: 'var(--rehaul-type-heading)', marginBottom: 'var(--rehaul-spacing-sm)' }}>Local delivery</h2>
          <p style={{ color: 'var(--rehaul-ink-secondary)', lineHeight: 1.6 }}>Clean-route delivery across Calgary with optional assembly.</p>
        </div>
        <div style={{ background: 'var(--rehaul-surface)', borderRadius: 'var(--rehaul-radius)', padding: 'var(--rehaul-spacing-lg)', border: '1px solid var(--rehaul-border)' }}>
          <h2 style={{ fontSize: 'var(--rehaul-type-heading)', marginBottom: 'var(--rehaul-spacing-sm)' }}>Landfill diversion</h2>
          <p style={{ color: 'var(--rehaul-ink-secondary)', lineHeight: 1.6 }}>Proceeds support responsible reuse and recycling operations.</p>
        </div>
      </section>
    </div>
  );
}
