import { getTenantBySlug } from '@/lib/rehaul';
import { getPublishedListings } from '@/lib/rehaulListings';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ShopPage() {
  const tenant = await getTenantBySlug('rehaul');
  const listings = await getPublishedListings({ tenantId: tenant.id });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'var(--rehaul-spacing-xl) var(--rehaul-spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--rehaul-type-display)', marginBottom: 'var(--rehaul-spacing-lg)' }}>Shop</h1>
      {listings.length === 0 && <p style={{ color: 'var(--rehaul-ink-secondary)' }}>No listings yet.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--rehaul-spacing-lg)' }}>
        {listings.map((listing) => (
          <Link key={listing.id} href={`/shop/${listing.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: 'var(--rehaul-surface)', borderRadius: 'var(--rehaul-radius)', padding: 'var(--rehaul-spacing-md)', border: '1px solid var(--rehaul-border)' }}>
              <div style={{ height: '200px', background: 'var(--rehaul-accent-light)', borderRadius: '6px', marginBottom: 'var(--rehaul-spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rehaul-accent)' }}>
                {listing.rehaul_media?.[0] ? 'Image' : 'No photo'}
              </div>
              <h2 style={{ fontSize: 'var(--rehaul-type-heading)', marginBottom: 'var(--rehaul-spacing-xs)' }}>{listing.title}</h2>
              <p style={{ color: 'var(--rehaul-ink-secondary)' }}>${(listing.listed_price_cents / 100).toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
