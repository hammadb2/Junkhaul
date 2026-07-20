import { getTenantBySlug } from '@/lib/rehaul';
import { getPublishedListings } from '@/lib/rehaulListings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ListingDetailPage({ params }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug('rehaul');
  const listings = await getPublishedListings({ tenantId: tenant.id });
  const listing = listings.find((l) => l.slug === slug);

  if (!listing) return <div style={{ padding: 'var(--rehaul-spacing-xl)' }}>Listing not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--rehaul-spacing-xl) var(--rehaul-spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--rehaul-type-display)', marginBottom: 'var(--rehaul-spacing-md)' }}>{listing.title}</h1>
      <p style={{ fontSize: '1.5rem', color: 'var(--rehaul-accent)', marginBottom: 'var(--rehaul-spacing-md)' }}>
        ${(listing.listed_price_cents / 100).toFixed(2)}
      </p>
      <p style={{ color: 'var(--rehaul-ink-secondary)', marginBottom: 'var(--rehaul-spacing-lg)', lineHeight: 1.6 }}>
        {listing.description}
      </p>

      {listing.condition_summary && (
        <div style={{ marginBottom: 'var(--rehaul-spacing-md)' }}>
          <strong>Condition:</strong> {listing.condition_summary}
        </div>
      )}

      {listing.rehaul_listing_defects?.length > 0 && (
        <div style={{ background: '#fff9f9', border: '1px solid #f5c6c6', borderRadius: '6px', padding: 'var(--rehaul-spacing-md)', marginBottom: 'var(--rehaul-spacing-lg)' }}>
          <strong>Disclosed defects</strong>
          <ul style={{ marginTop: 'var(--rehaul-spacing-sm)', paddingLeft: '1.5rem' }}>
            {listing.rehaul_listing_defects.map((d) => (
              <li key={d.id} style={{ marginBottom: 'var(--rehaul-spacing-xs)' }}>
                {d.description} {d.severity && <em>({d.severity})</em>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form style={{ marginBottom: 'var(--rehaul-spacing-lg)' }}>
        <label style={{ display: 'flex', gap: 'var(--rehaul-spacing-sm)', alignItems: 'flex-start', marginBottom: 'var(--rehaul-spacing-md)' }}>
          <input type="checkbox" required />
          <span>I understand this is a final sale and have reviewed the condition and defects.</span>
        </label>
        <button type="submit" style={{ background: 'var(--rehaul-accent)', color: '#fff', border: 'none', borderRadius: '6px', padding: 'var(--rehaul-spacing-sm) var(--rehaul-spacing-md)', fontSize: 'var(--rehaul-type-body)', cursor: 'pointer' }}>
          Add to cart
        </button>
      </form>

      {listing.provenance && (
        <p style={{ color: 'var(--rehaul-ink-secondary)', fontSize: 'var(--rehaul-type-small)' }}>
          Provenance: {listing.provenance}
        </p>
      )}
    </div>
  );
}
