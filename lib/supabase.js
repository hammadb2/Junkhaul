import { createClient } from '@supabase/supabase-js';

// ============================================================
// Server-side admin client (service role — full access, bypasses RLS).
// NEVER import this into client components.
//
// Lazily initialised via a Proxy so that merely importing this module never
// requires env vars — the client is only constructed on first property access
// at request time. This keeps `next build` working without secrets present.
// ============================================================
let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getAdmin();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

// ============================================================
// Browser/anon client (safe for client components — RLS applies).
// ============================================================
export const createBrowserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

export const PHOTO_BUCKET = 'booking-photos';
