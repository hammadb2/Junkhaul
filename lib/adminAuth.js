// Shared admin auth token. Works in both Node and Edge (middleware) runtimes
// via the Web Crypto API. The cookie stores a hash of ADMIN_PASSWORD so the
// raw password is never persisted client-side.
export const ADMIN_COOKIE = 'jh_admin';

export async function adminToken() {
  const secret = process.env.ADMIN_PASSWORD || '';
  const data = new TextEncoder().encode(`junkhaul:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
