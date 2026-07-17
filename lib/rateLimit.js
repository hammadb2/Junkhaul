const buckets = new Map();

function keyFor(scope, key) {
  return `${scope}:${key || 'unknown'}`;
}

export function getClientKey(req, fallback = 'anonymous') {
  const forwarded = req?.headers?.get?.('x-forwarded-for')?.split(',')?.[0]?.trim();
  const realIp = req?.headers?.get?.('x-real-ip')?.trim();
  return forwarded || realIp || fallback;
}

export function checkRateLimit({ scope, key, limit, windowMs }) {
  const now = Date.now();
  const bucketKey = keyFor(scope, key);
  const existing = buckets.get(bucketKey) || [];
  const recent = existing.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    const oldest = Math.min(...recent);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
      remaining: 0,
    };
  }
  recent.push(now);
  buckets.set(bucketKey, recent);
  return { ok: true, remaining: Math.max(0, limit - recent.length), retryAfterSeconds: 0 };
}

export function assertRateLimit(input) {
  const result = checkRateLimit(input);
  if (!result.ok) {
    const error = new Error(`Rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`);
    error.status = 429;
    error.retryAfterSeconds = result.retryAfterSeconds;
    throw error;
  }
  return result;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
