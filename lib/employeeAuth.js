// ============================================================
// EMPLOYEE AUTH — email + password session auth.
//
// Passwords are hashed with Node's scrypt (salted, N=16384).
// Sessions are random 32-byte hex tokens stored in
// `employee_sessions` and set as an httpOnly cookie
// `jh_employee_session` (30-day expiry).
//
// All verification happens server-side via the service role.
// ============================================================

import { createHash, randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'crypto';
import { supabaseAdmin } from './supabase';

export const SESSION_COOKIE = 'jh_employee_session';
const SESSION_TTL_DAYS = 30;
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 64;

// ------------------------------------------------------------
// Password hashing (scrypt with random salt)
// ------------------------------------------------------------
export function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  // Format: scrypt$N$r$p$saltHex$hashHex
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  const derived = scryptSync(password, salt, expected.length, { N, r, p });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// ------------------------------------------------------------
// SIN / banking encryption at rest (AES-256-GCM).
// Key from EMPLOYEE_ENC_KEY env var (32-byte hex). If unset,
// falls back to a derived key from SUPABASE service role — but
// production MUST set EMPLOYEE_ENC_KEY.
// ------------------------------------------------------------
function encKey() {
  const k = process.env.EMPLOYEE_ENC_KEY;
  if (k) return Buffer.from(k, 'hex');
  // Fallback (NOT for production): derive from a constant so dev works.
  return createHash('sha256').update('jh-employee-enc-fallback').digest();
}

export function encryptField(plaintext) {
  if (!plaintext) return null;
  const key = encKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptField(blob) {
  if (!blob) return null;
  try {
    const [ivHex, tagHex, encHex] = blob.split(':');
    const key = encKey();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Session creation / lookup / deletion
// ------------------------------------------------------------
export async function createSession(employeeId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5).toISOString();
  const { error } = await supabaseAdmin
    .from('employee_sessions')
    .insert({ token, employee_id: employeeId, expires_at: expiresAt });
  if (error) return null;
  return { token, expiresAt };
}

export async function getSessionEmployee(token) {
  if (!token) return null;
  const { data: sess } = await supabaseAdmin
    .from('employee_sessions')
    .select('employee_id, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (!sess) return null;
  if (new Date(sess.expires_at) < new Date()) {
    await supabaseAdmin.from('employee_sessions').delete().eq('token', token);
    return null;
  }
  // Touch last_seen
  await supabaseAdmin.from('employee_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('token', token);

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, phone, status, pay_rate, onboarded_at, drive_folder_id')
    .eq('id', sess.employee_id)
    .maybeSingle();
  return emp;
}

export async function destroySession(token) {
  if (!token) return;
  await supabaseAdmin.from('employee_sessions').delete().eq('token', token);
}

// ------------------------------------------------------------
// Middleware-style helper for route handlers.
// Returns the employee row or null. Reads token from cookie.
// ------------------------------------------------------------
export async function getAuthedEmployee(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match ? match[1] : null;
  return getSessionEmployee(token);
}

export function sessionCookieHeader(token, expiresAt) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${new Date(expiresAt).toUTCString()}`;
}

export function clearCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
