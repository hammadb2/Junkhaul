export const runtime = 'edge';

export const metadata = {
  title: 'Donate | Rehaul',
  description: 'Schedule a free Rehaul donation pickup for quality used furniture and home goods.',
};

export default function DonatePage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--rehaul-spacing-xl) var(--rehaul-spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--rehaul-type-heading)', marginBottom: 'var(--rehaul-spacing-md)' }}>
        Donate quality home goods
      </h1>
      <p style={{ color: 'var(--rehaul-ink-secondary)', marginBottom: 'var(--rehaul-spacing-lg)', lineHeight: 1.6 }}>
        We pick up furniture, appliances and décor, inspect them carefully, and resell, recycle or dispose responsibly.
        Our team will review photos before final acceptance.
      </p>

      <form style={{ background: 'var(--rehaul-surface)', borderRadius: 'var(--rehaul-radius)', padding: 'var(--rehaul-spacing-lg)', border: '1px solid var(--rehaul-border)' }}>
        <label style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-md)' }}>
          <span style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-xs)' }}>Address</span>
          <input type="text" style={{ width: '100%', padding: 'var(--rehaul-spacing-sm)', border: '1px solid var(--rehaul-border)', borderRadius: '6px' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-md)' }}>
          <span style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-xs)' }}>Preferred pickup date</span>
          <input type="date" style={{ padding: 'var(--rehaul-spacing-sm)', border: '1px solid var(--rehaul-border)', borderRadius: '6px' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-md)' }}>
          <span style={{ display: 'block', marginBottom: 'var(--rehaul-spacing-xs)' }}>Items you would like to donate</span>
          <textarea rows="4" style={{ width: '100%', padding: 'var(--rehaul-spacing-sm)', border: '1px solid var(--rehaul-border)', borderRadius: '6px' }} />
        </label>
        <label style={{ display: 'flex', gap: 'var(--rehaul-spacing-sm)', alignItems: 'flex-start', marginBottom: 'var(--rehaul-spacing-md)', color: 'var(--rehaul-ink-secondary)' }}>
          <input type="checkbox" />
          <span>I consent to Rehaul inspecting my items. Acceptance is not guaranteed until physical inspection.</span>
        </label>
        <button type="submit" style={{ background: 'var(--rehaul-accent)', color: '#fff', border: 'none', borderRadius: '6px', padding: 'var(--rehaul-spacing-sm) var(--rehaul-spacing-md)', fontSize: 'var(--rehaul-type-body)', cursor: 'pointer' }}>
          Submit donation request
        </button>
      </form>
    </div>
  );
}
