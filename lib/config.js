// ============================================================
// RUNTIME CONFIGURATION — centralized loader for system_config.
//
// Every algorithm file calls this instead of reading constants
// from source. If a config row is missing, the hardcoded default
// is used, so removing a row never crashes the system.
//
// Usage:
//   const { getConfig, getBooleanConfig, getNumberConfig } = await import('./config');
//   const max = await getNumberConfig('surge_max_multiplier', 1.30);
//
// The async call lets the service role key read once and cache
// for subsequent calls. (Each process lifetime is short enough
// that a simple cache with TTL is fine.)
// ============================================================

import { supabaseAdmin } from './supabase.js';

let cache = null;
let cacheExpires = 0;
const CACHE_TTL_MS = 5000; // 5 seconds in dev, keep fast in production

const refreshConfig = async () => {
  const now = Date.now();
  if (cache && cacheExpires > now) return cache;

  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('key, value, value_type');

    if (error) {
      console.error('system_config load failed:', error);
      return cache || {};
    }

    const map = {};
    for (const row of data || []) {
      map[row.key] = row.value;
    }
    cache = map;
    cacheExpires = now + CACHE_TTL_MS;
    return map;
  } catch (err) {
    console.error('system_config exception:', err);
    return cache || {};
  }
};

export const getConfig = async (key, fallback = null) => {
  const cfg = await refreshConfig();
  return cfg[key] !== undefined ? cfg[key] : fallback;
};

export const getStringConfig = async (key, fallback = null) => {
  return getConfig(key, fallback);
};

export const getBooleanConfig = async (key, fallback = false) => {
  const raw = await getConfig(key, String(fallback));
  if (typeof raw === 'string') {
    return raw.toLowerCase() === 'true' || raw === '1';
  }
  return Boolean(raw);
};

export const getNumberConfig = async (key, fallback = 0) => {
  const raw = await getConfig(key, String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getJsonConfig = async (key, fallback = null) => {
  const raw = await getConfig(key, null);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// Bulk loader for admin UI and config-dependent files
export const getAllConfig = async () => {
  const { data } = await supabaseAdmin.from('system_config').select('*').order('category');
  return data || [];
};

// Explicitly invalidate cache (e.g. after admin saves)
export const invalidateConfigCache = () => {
  cache = null;
  cacheExpires = 0;
};
