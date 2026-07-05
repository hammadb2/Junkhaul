import { createClient } from '@supabase/supabase-js';

// ============================================================
// Server-side admin client (service role — full access, bypasses RLS).
// NEVER import this into client components.
// ============================================================
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
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
