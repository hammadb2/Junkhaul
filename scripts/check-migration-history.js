import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'supabase/migrations/MANIFEST.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

let failed = false;

for (const [file, expectedHash] of Object.entries(manifest.files || {})) {
  const path = join(process.cwd(), 'supabase/migrations', file);
  const actualHash = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actualHash !== expectedHash) {
    failed = true;
    console.error(`${file}: hash mismatch`);
    console.error(`  expected ${expectedHash}`);
    console.error(`  actual   ${actualHash}`);
  }
}

if (failed) {
  console.error('Migration history check failed. Applied migrations are immutable; add a forward migration instead.');
  process.exit(1);
}

console.log(`Migration history check passed for ${Object.keys(manifest.files || {}).length} files.`);
