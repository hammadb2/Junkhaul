import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const SOURCE_DIRS = ['app', 'components', 'lib', 'tests', 'scripts', 'supabase'];
const BUILD_OUTPUT_DIRS = ['.next/static', '.next/server'];

const PATTERNS = [
  { name: 'Stripe secret key', regex: /sk_(live|test)_[A-Za-z0-9]{24,}/g },
  { name: 'Supabase service-role JWT', regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g },
  { name: 'Private key block', regex: /-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----/g },
];

const EXCLUDED_FILE_REGEX = /node_modules|\.next\/|package-lock\.json|\.env\.(example|integration\.example)$/;

function* walk(dir, base = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      yield* walk(path, base);
    } else if (entry.isFile()) {
      const rel = relative(base, path);
      if (!EXCLUDED_FILE_REGEX.test(path)) {
        yield { path, rel };
      }
    }
  }
}

function scanFile(path, patterns, hits) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const { name, regex } of patterns) {
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches) {
        // Allow clearly fake placeholders in example files.
        if (/^(sk_test_xxxxx|eyJexample|your-|replace-with|xxxxx)$/i.test(match)) continue;
        hits.push({ file: path, type: name, sample: match.slice(0, 80) });
      }
    }
  }
}

function scanBuildForLiteralValue(path, value, hits) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  if (text.includes(value)) {
    hits.push({ file: path, type: 'inlined environment secret', sample: value.slice(0, 80) });
  }
}

const hits = [];

// Scan source for generic secret patterns.
for (const dir of SOURCE_DIRS) {
  try {
    for (const { path } of walk(dir)) {
      scanFile(path, PATTERNS, hits);
    }
  } catch {
    // Directory may not exist; skip.
  }
}

// Scan build output for both generic patterns and specific environment values.
// CI_SECRET_SCAN_VARS is a comma-separated list of environment variable names
// whose values must never appear in the built client/server bundles.
const envNames = (process.env.CI_SECRET_SCAN_VARS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const envValues = envNames
  .map((name) => process.env[name])
  .filter((v) => v && v.length >= 8 && !/^(your-|replace-with|xxxxx)/i.test(v));

for (const dir of BUILD_OUTPUT_DIRS) {
  try {
    for (const { path } of walk(dir)) {
      scanFile(path, PATTERNS, hits);
      for (const value of envValues) {
        scanBuildForLiteralValue(path, value, hits);
      }
    }
  } catch {
    // Build output may not exist; skip.
  }
}

// Ensure no real .env files are tracked by git.
const tracked = execFileSync('git', ['ls-files', '.env*', '*.pem', '*.key'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/\.env\.(example|integration\.example)$/.test(f));

if (tracked.length) {
  for (const file of tracked) {
    hits.push({ file, type: 'tracked sensitive file', sample: file });
  }
}

if (hits.length) {
  console.error('Secret scan failed — potential hardcoded secrets or sensitive files found:');
  for (const hit of hits) {
    console.error(`  ${hit.type} in ${hit.file}: ${hit.sample}`);
  }
  process.exit(1);
}

console.log('Secret scan passed: no hardcoded secrets or tracked .env files found.');
