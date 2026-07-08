// ============================================================
// CRON AUTH — shared helper for automated job endpoints.
// pg_cron / Vercel Cron sends x-cron-secret header.
// ============================================================

export function checkCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const provided = req.headers.get('x-cron-secret') || '';
  if (provided === secret) return true;
  // Also allow Bearer token for Vercel Cron
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}
