// ============================================================
// CREW AUTH — verifies the x-crew-pin header against the stored hash.
// Uses constant-time comparison to prevent timing attacks.
// ============================================================

import { supabaseAdmin } from './supabase';

// Fallback hash if the crew_pin table isn't populated yet.
// Set CREW_PIN_HASH env var to the SHA-256 of the 4-digit PIN.
const FALLBACK_HASH = process.env.CREW_PIN_HASH || '';

export async function verifyCrewPin(pinHashFromClient) {
  if (!pinHashFromClient || typeof pinHashFromClient !== 'string') return false;

  // Look up the stored hash from the crew_pin table (fallback to env var)
  let storedHash = FALLBACK_HASH;
  try {
    const { data } = await supabaseAdmin
      .from('crew_pin')
      .select('pin_hash')
      .eq('id', 1)
      .maybeSingle();
    if (data?.pin_hash) storedHash = data.pin_hash;
  } catch {
    // fall through to env var
  }

  if (!storedHash) return false;

  // Constant-time comparison
  const a = Buffer.from(pinHashFromClient);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function crewAuth(req) {
  const pinHash = req.headers.get('x-crew-pin') || '';
  return verifyCrewPin(pinHash);
}
