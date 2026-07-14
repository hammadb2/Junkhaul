// Shared helpers for the redesigned admin console components.
// Pure presentation helpers only — no data fetching here.

export const LOAD_LABELS = {
  single_item: '1-2 items',
  quarter: 'Small load',
  half: 'Half load',
  full: 'Full load',
};

export const LOAD_PRICE = { single_item: 99, quarter: 160, half: 240, full: 380 };

export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-CA');
}

// Returns a React style object for a status/semantic pill (badge).
export function badgeStyle(bg, fg) {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 999,
    background: bg,
    color: fg,
    whiteSpace: 'nowrap',
  };
}

export function cmp(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function sortRows(rows, key, dir) {
  const out = [...rows].sort((a, b) => cmp(a[key], b[key]));
  return dir === 'desc' ? out.reverse() : out;
}

// ── Design tokens (brand palette — do not change without design sign-off) ──
export const COLORS = {
  canvas: '#F5F5F7',
  card: '#FFFFFF',
  input: '#F0F0F2',
  border: 'rgba(0,0,0,.06)',
  borderStrong: 'rgba(0,0,0,.08)',
  textPrimary: '#1a1a1a',
  textSecondary: 'rgba(0,0,0,.55)',
  textTertiary: 'rgba(0,0,0,.4)',
  brand: '#f97316',
  brandDark: '#ea580c',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#3B82F6',
  warning: '#F59E0B',
};
